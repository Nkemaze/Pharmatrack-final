import { AppError, ErrorCodes } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED);
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      throw new AppError(
        err.name === 'TokenExpiredError' ? ErrorCodes.TOKEN_EXPIRED : ErrorCodes.AUTH_REQUIRED,
      );
    }

    const revoked = await prisma.revokedAccessToken.findUnique({ where: { jti: payload.jti } });
    if (revoked) throw new AppError(ErrorCodes.TOKEN_REVOKED);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(ErrorCodes.ACCOUNT_BLOCKED);
    }

    req.user = user;
    req.auth = payload;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(ErrorCodes.FORBIDDEN));
    }
    next();
  };

export function requirePharmacy(req, _res, next) {
  if (req.user.role === 'ADMIN') return next();
  if (!req.user.pharmacyId) return next(new AppError(ErrorCodes.FORBIDDEN));
  next();
}