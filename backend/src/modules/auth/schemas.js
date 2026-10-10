import { z } from 'zod';

const password = z.string().min(8, 'Password must be at least 8 characters');
const email = z.string().trim().toLowerCase().email('A valid email is required');

export const loginSchema = z.strictObject({
  identifier: z.string().trim().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.strictObject({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const logoutSchema = z.strictObject({
  refreshToken: z.string().min(1).optional(),
});

export const setupAdminSchema = z.strictObject({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email,
  password,
  setupCode: z.string().min(1, 'setupCode is required'),
});

export const registerPharmacySchema = z.strictObject({
  pharmacyName: z.string().trim().min(3, 'Pharmacy name must be at least 3 characters'),
  email,
  password,
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

const coordinate = z.string().regex(/^-?\d+(\.\d+)?$/, 'Must be a numeric string');

export const completeProfileSchema = z.strictObject({
  pharmacy: z
    .strictObject({
      name: z.string().trim().min(1).optional(),
      address: z.string().trim().nullish(),
      city: z.string().trim().nullish(),
      state: z.string().trim().nullish(),
      zipCode: z.string().trim().nullish(),
      phone: z.string().trim().nullish(),
      email: email.nullish(),
      emergencyPhone: z.string().trim().nullish(),
      emergencyDesc: z.string().trim().nullish(),
      latitude: coordinate.nullish(),
      longitude: coordinate.nullish(),
      openingHours: z
        .strictObject({
          weekdayOpen: z.string().nullish(),
          weekdayClose: z.string().nullish(),
          weekendOpen: z.string().nullish(),
          weekendClose: z.string().nullish(),
        })
        .nullish(),
    })
    .strict(),
  newPassword: password,
  currentPassword: z.string().min(1, 'currentPassword is required'),
});