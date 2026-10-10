import { z } from 'zod';
import { AdjustmentDirections, MovementTypes } from '../../lib/stock.js';

const uuid = z.string().uuid();
const numeric = z.string().regex(/^\d+(\.\d+)?$/, 'Must be a numeric string');
const dateTime = z.string().datetime({ offset: true }).optional();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const productFields = {
  name: z.string().trim().min(1, 'Name is required'),
  category: z.string().trim().nullish(),
  strength: z.string().trim().nullish(),
  dosageForm: z.string().trim().nullish(),
  barcode: z.string().trim().nullish(),
  requiresPrescription: z.boolean().default(false),
  isControlled: z.boolean().default(false),
  pricePerUnit: numeric.nullish(),
  pricePerPacket: numeric.nullish(),
  packetSize: z.coerce.number().int().positive().nullish(),
  unitLabel: z.string().trim().max(40).default('unit'),
  imageUrl: z.string().trim().nullish(),
  lowStockThreshold: z.coerce.number().int().nonnegative().nullish(),
};

export const productCreateSchema = z.strictObject({
  ...productFields,
  pharmacyId: uuid.optional(),
  batchNumber: z.string().trim().nullish(),
  expiryDate: dateOnly.nullish(),
  initialQuantity: z.coerce.number().int().positive().nullish(),
});

export const productUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().nullish(),
  strength: z.string().trim().nullish(),
  dosageForm: z.string().trim().nullish(),
  barcode: z.string().trim().nullish(),
  requiresPrescription: z.boolean().optional(),
  isControlled: z.boolean().optional(),
  pricePerUnit: numeric.nullish(),
  pricePerPacket: numeric.nullish(),
  packetSize: z.coerce.number().int().positive().nullish(),
  unitLabel: z.string().trim().max(40).nullish(),
  imageUrl: z.string().trim().nullish(),
  lowStockThreshold: z.coerce.number().int().nonnegative().nullish(),
});

export const productListQuerySchema = z.strictObject({
  q: z.string().trim().nullish(),
  pharmacyId: uuid.optional(),
  ...pagination,
});

export const productParamsSchema = z.strictObject({ id: uuid });

export const batchCreateSchema = z.strictObject({
  batchNumber: z.string().trim().nullish(),
  expiryDate: dateOnly.nullish(),
  initialQuantity: z.coerce.number().int().positive().nullish(),
});

export const batchUpdateSchema = z.strictObject({
  batchNumber: z.string().trim().nullish(),
  expiryDate: dateOnly.nullish(),
});

export const batchParamsSchema = z.strictObject({ id: uuid });

export const movementCreateSchema = z.strictObject({
  batchId: uuid,
  type: z.enum(MovementTypes),
  quantity: z.coerce.number().int().min(1, 'quantity must be >= 1'),
  direction: z.enum(AdjustmentDirections).optional(),
  counterpartyName: z.string().trim().nullish(),
  counterpartyAddress: z.string().trim().nullish(),
  referenceNumber: z.string().trim().nullish(),
  prescriptionNumber: z.string().trim().nullish(),
  reason: z.string().trim().nullish(),
  occurredAt: dateTime,
});

export const movementListQuerySchema = z.strictObject({
  batchId: uuid.optional(),
  productId: uuid.optional(),
  type: z.enum(MovementTypes).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ...pagination,
});

export const lossReportListQuerySchema = z.strictObject({
  unreportedOnly: z.coerce.boolean().default(false),
  ...pagination,
});

export const lossReportParamsSchema = z.strictObject({ id: uuid });

export const lossReportUpdateSchema = z.strictObject({
  authorityReference: z.string().trim().nullish(),
});