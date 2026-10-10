import { z } from 'zod';

const uuid = z.string().uuid();

export const listPharmaciesQuerySchema = z.strictObject({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DELETED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createPharmacySchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  address: z.string().trim().nullish(),
  city: z.string().trim().nullish(),
  phone: z.string().trim().nullish(),
});

export const pharmacyStatusSchema = z.strictObject({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REJECTED']),
});

export const pharmacyParamsSchema = z.strictObject({ id: uuid });

export const listUsersQuerySchema = z.strictObject({
  role: z.enum(['ADMIN', 'PHARMACY', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createUserSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email().nullish(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['PHARMACY', 'USER']),
  pharmacyId: uuid.optional(),
});

export const userParamsSchema = z.strictObject({ id: uuid });