import { AppError, ErrorCodes } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/password.js';

const serializeRow = (pharmacy) => ({
  id: pharmacy.id,
  name: pharmacy.name,
  email: pharmacy.email,
  city: pharmacy.city,
  phone: pharmacy.phone,
  status: pharmacy.status,
  createdAt: pharmacy.createdAt,
  applicant: pharmacy.users
    ? pharmacy.users.map((u) => ({ id: u.id, email: u.email, name: u.name, status: u.status }))
    : [],
});

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  pharmacyId: user.pharmacyId,
  mustUpdateProfile: user.mustUpdateProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export async function listPharmacies({ query }) {
  const where = query.status ? { status: query.status } : {};
  const total = await prisma.pharmacy.count({ where });
  const pharmacies = await prisma.pharmacy.findMany({
    where,
    include: { users: { select: { id: true, name: true, email: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return {
    data: pharmacies.map(serializeRow),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) || 1 },
  };
}

export async function createPharmacy({ data }) {
  const passwordHash = await hashPassword(data.password);
  const pharmacy = await prisma.$transaction(async (tx) => {
    const created = await tx.pharmacy.create({
      data: {
        name: data.name,
        email: data.email,
        address: data.address ?? null,
        city: data.city ?? null,
        phone: data.phone ?? null,
        status: 'ACTIVE',
      },
    });
    const name = data.email ? data.email.split('@')[0] : `pharmacy-${created.name}`;
    const user = await tx.user.create({
      data: {
        name,
        email: data.email,
        passwordHash,
        role: 'PHARMACY',
        status: 'ACTIVE',
        mustUpdateProfile: true,
        pharmacyId: created.id,
      },
    });
    return { pharmacy: created, user };
  });
  return { id: pharmacy.pharmacy.id, user: serializeUser(pharmacy.user) };
}

const PHARMACY_USER_SELECT = {
  users: { where: { role: 'PHARMACY' }, select: { id: true, name: true, email: true, status: true } },
};

async function findPharmacyWithUser(pharmacyId) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: PHARMACY_USER_SELECT,
  });
  if (!pharmacy) throw new AppError(ErrorCodes.NOT_FOUND);
  return pharmacy;
}

export async function updatePharmacyStatus({ pharmacyId, status }) {
  const pharmacy = await findPharmacyWithUser(pharmacyId);

  const pharmacyStatus = status;
  const userStatus = status === 'ACTIVE' ? 'ACTIVE' : status === 'REJECTED' ? 'PENDING' : 'SUSPENDED';
  const updated = await prisma.$transaction(async (tx) => {
    await tx.pharmacy.update({ where: { id: pharmacyId }, data: { status: pharmacyStatus } });
    if (pharmacy.users[0]) {
      await tx.user.update({
        where: { id: pharmacy.users[0].id },
        data: { status: userStatus, ...(status === 'ACTIVE' ? { mustUpdateProfile: true } : {}) },
      });
    }
    return tx.pharmacy.findUnique({ where: { id: pharmacyId }, include: PHARMACY_USER_SELECT });
  });
  return serializeRow(updated);
}

export async function softDeletePharmacy({ pharmacyId }) {
  const pharmacy = await findPharmacyWithUser(pharmacyId);
  await prisma.$transaction(async (tx) => {
    await tx.pharmacy.update({ where: { id: pharmacyId }, data: { status: 'DELETED' } });
    if (pharmacy.users[0]) {
      await tx.user.update({ where: { id: pharmacy.users[0].id }, data: { status: 'SUSPENDED' } });
    }
  });
  return { id: pharmacyId, status: 'DELETED' };
}

export async function listUsers({ query }) {
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const total = await prisma.user.count({ where });
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return {
    data: users.map(serializeUser),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) || 1 },
  };
}

export async function createUser({ data }) {
  if (data.pharmacyId) {
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: data.pharmacyId } });
    if (!pharmacy) throw new AppError(ErrorCodes.NOT_FOUND, 'pharmacyId does not exist');
  }
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email ?? null,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      status: 'ACTIVE',
      pharmacyId: data.pharmacyId ?? null,
      mustUpdateProfile: data.role === 'PHARMACY' && data.pharmacyId != null,
    },
  });
  return serializeUser(user);
}

export async function deleteUser({ adminId, userId }) {
  if (userId === adminId) throw new AppError(ErrorCodes.CONFLICT, 'You cannot delete your own account');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(ErrorCodes.NOT_FOUND);
  await prisma.user.delete({ where: { id: userId } });
  return { id: userId };
}