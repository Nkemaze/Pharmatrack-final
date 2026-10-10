import { config } from '../../config/index.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';
import { signAccessToken, signRefreshToken, ttlToSeconds, verifyRefreshToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { serializePharmacy, serializeUser } from '../../lib/serializers.js';

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 60_000;

const loginKey = (identifier) => identifier.trim().toLowerCase();

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function issueTokens(user) {
  const { token: accessToken } = signAccessToken(user);
  const { token: refreshToken, jti: refreshJti } = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + ttlToSeconds(config.jwt.refreshTtl) * 1000);
  await prisma.refreshToken.create({ data: { jti: refreshJti, userId: user.id, expiresAt } });
  return {
    accessToken,
    refreshToken,
    expiresIn: ttlToSeconds(config.jwt.accessTtl),
  };
}

// --- Login lockout (DB-backed) -------------------------------------------------

export async function checkLoginLockout(key) {
  const row = await prisma.loginAttempt.findUnique({
    where: { scope_key: { scope: 'login', key } },
  });
  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    const err = new AppError(ErrorCodes.RATE_LIMITED, 'Too many failed attempts. Try again later.');
    err.retryAfter = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000);
    throw err;
  }
}

export async function recordFailedLogin(key) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS);
  const where = { scope_key: { scope: 'login', key } };

  const row = await prisma.loginAttempt.findUnique({ where });
  if (!row) {
    await prisma.loginAttempt.create({ data: { scope: 'login', key, count: 1, firstAttemptAt: now } });
    return;
  }

  if (row.firstAttemptAt < windowStart) {
    await prisma.loginAttempt.update({
      where,
      data: { count: 1, firstAttemptAt: now, lockedUntil: null },
    });
    return;
  }

  const count = row.count + 1;
  const lockedUntil = count >= LOGIN_MAX_ATTEMPTS ? new Date(now.getTime() + LOGIN_LOCK_MS) : null;
  await prisma.loginAttempt.update({ where, data: { count, lockedUntil } });
}

export async function clearLoginAttempts(key) {
  await prisma.loginAttempt.deleteMany({ where: { scope: 'login', key } });
}

// --- Operations ----------------------------------------------------------------

export async function setupAdmin({ name, email, password, setupCode }) {
  if (setupCode !== config.adminSetupCode) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Invalid setup code');
  }
  const existing = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existing) throw new AppError(ErrorCodes.CONFLICT, 'Admin already set up');

  const user = await prisma.user.create({
    data: { name, email, role: 'ADMIN', status: 'ACTIVE', passwordHash: await hashPassword(password) },
  });
  return serializeUser(user);
}

export async function login({ identifier, password }) {
  const key = loginKey(identifier);
  await checkLoginLockout(key);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier.trim(), mode: 'insensitive' } },
        { name: { equals: identifier.trim(), mode: 'insensitive' } },
      ],
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await recordFailedLogin(key);
    throw new AppError(ErrorCodes.INVALID_CREDENTIALS);
  }

  await clearLoginAttempts(key);
  if (user.status !== 'ACTIVE') throw new AppError(ErrorCodes.ACCOUNT_BLOCKED);

  if (user.role === 'PHARMACY' && user.pharmacyId) {
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: user.pharmacyId } });
    if (!pharmacy || pharmacy.status !== 'ACTIVE') {
      throw new AppError(ErrorCodes.ACCOUNT_BLOCKED, 'The pharmacy account is not active');
    }
  }

  const { accessToken, refreshToken, expiresIn } = await issueTokens(user);
  return { accessToken, refreshToken, expiresIn, user: serializeUser(user) };
}

export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Invalid refresh token');
  }
  if (payload.typ !== 'refresh') throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Invalid token type');

  const stored = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
  if (!stored || stored.revokedAt) throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Refresh token revoked');
  if (stored.expiresAt < new Date()) throw new AppError(ErrorCodes.TOKEN_EXPIRED, 'Refresh token expired');

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.status !== 'ACTIVE') throw new AppError(ErrorCodes.ACCOUNT_BLOCKED);

  const next = await issueTokens(user);
  await prisma.refreshToken.update({
    where: { jti: stored.jti },
    data: { revokedAt: new Date(), replacedByJti: next.refreshJti },
  });

  return next;
}

export async function logout({ user, auth, refreshToken }) {
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { jti: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // unknown/expired refresh token — ignore, access token is still revoked below
    }
  }

  if (auth?.jti) {
    await prisma.revokedAccessToken.upsert({
      where: { jti: auth.jti },
      update: {},
      create: {
        jti: auth.jti,
        userId: user.id,
        expiresAt: auth.exp ? new Date(auth.exp * 1000) : new Date(),
      },
    });
  }

  return { message: 'logged out' };
}

export async function me(user) {
  const result = serializeUser(user);
  const pharmacy = user.pharmacyId
    ? await prisma.pharmacy.findUnique({ where: { id: user.pharmacyId } })
    : null;
  return pharmacy ? { ...result, pharmacy: serializePharmacy(pharmacy) } : result;
}

export async function registerPharmacy({ pharmacyName, email, password, address, city, phone }) {
  const passwordHash = await hashPassword(password);
  const baseName = slugify(pharmacyName);
  let name = baseName;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { name } })) {
    name = `${baseName}-${suffix++}`;
  }

  const { applicationId } = await prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.create({
      data: { name: pharmacyName, address, city, phone, email, status: 'PENDING' },
    });
    await tx.user.create({
      data: { name, email, role: 'PHARMACY', status: 'PENDING', pharmacyId: pharmacy.id, passwordHash },
    });
    return { applicationId: pharmacy.id };
  });

  return { applicationId };
}

export async function completeProfile({ user, pharmacy: pharmacyData, newPassword, currentPassword }) {
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect');
  }
  if (!user.pharmacyId) throw new AppError(ErrorCodes.FORBIDDEN, 'No pharmacy attached to this account');

  const mapped = {};
  if (pharmacyData.name !== undefined) mapped.name = pharmacyData.name;
  if (pharmacyData.address !== undefined) mapped.address = pharmacyData.address;
  if (pharmacyData.city !== undefined) mapped.city = pharmacyData.city;
  if (pharmacyData.state !== undefined) mapped.state = pharmacyData.state;
  if (pharmacyData.zipCode !== undefined) mapped.zipCode = pharmacyData.zipCode;
  if (pharmacyData.phone !== undefined) mapped.phone = pharmacyData.phone;
  if (pharmacyData.email !== undefined) mapped.email = pharmacyData.email;
  if (pharmacyData.emergencyPhone !== undefined) mapped.emergencyPhone = pharmacyData.emergencyPhone;
  if (pharmacyData.emergencyDesc !== undefined) mapped.emergencyDesc = pharmacyData.emergencyDesc;
  if (pharmacyData.latitude !== undefined) mapped.latitude = pharmacyData.latitude;
  if (pharmacyData.longitude !== undefined) mapped.longitude = pharmacyData.longitude;
  if (pharmacyData.openingHours !== undefined) mapped.openingHours = pharmacyData.openingHours;

  return prisma.$transaction(async (tx) => {
    if (Object.keys(mapped).length > 0) {
      await tx.pharmacy.update({ where: { id: user.pharmacyId }, data: mapped });
    }
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), mustUpdateProfile: false },
    });
    const updatedPharmacy = await tx.pharmacy.findUnique({ where: { id: user.pharmacyId } });
    return { user: serializeUser(updatedUser), pharmacy: serializePharmacy(updatedPharmacy) };
  });
}