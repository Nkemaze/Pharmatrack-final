import { z } from 'zod';

const uuid = z.string().uuid();
const coord = z.string().regex(/^-?\d+(\.\d+)?$/, 'Must be a numeric string');

export const pharmaciesQuerySchema = z.strictObject({
  city: z.string().trim().nullish(),
  nearLat: coord.nullish(),
  nearLng: coord.nullish(),
});

export const pharmacyParamsSchema = z.strictObject({ id: uuid });

export const pharmacyProductsQuerySchema = z.strictObject({
  q: z.string().trim().nullish(),
});

export const searchQuerySchema = z.strictObject({
  q: z.string().trim().min(1, 'q is required'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const popularQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});