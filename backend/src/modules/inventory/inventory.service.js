import { config } from '../../config/index.js';
import { AppError, ErrorCodes } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { serializeBatch, serializeMovement, serializeProductInventory } from '../../lib/serializers.js';
import { batchRemainingMap, signOf } from '../../lib/stock.js';

const isoDate = (d) => d.toISOString().slice(0, 10);
const parseDate = (s) => new Date(`${s}T00:00:00.000Z`);

const PRODUCT_FIELDS = [
  'name',
  'category',
  'strength',
  'dosageForm',
  'barcode',
  'requiresPrescription',
  'isControlled',
  'pricePerUnit',
  'pricePerPacket',
  'packetSize',
  'unitLabel',
  'imageUrl',
  'lowStockThreshold',
];

const BATCH_FIELDS = ['batchNumber', 'expiryDate'];

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

function resolvePharmacyId(user, queryOrData) {
  if (user.role === 'ADMIN') {
    const pharmacyId = queryOrData?.pharmacyId;
    if (!pharmacyId) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'pharmacyId is required for admin access', {
        status: 400,
      });
    }
    return pharmacyId;
  }
  if (!user.pharmacyId) throw new AppError(ErrorCodes.FORBIDDEN);
  return user.pharmacyId;
}

async function assertProductScope(productId, pharmacyId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(ErrorCodes.NOT_FOUND);
  if (product.pharmacyId !== pharmacyId) throw new AppError(ErrorCodes.TENANT_SCOPE);
  return product;
}

// --- Products ----------------------------------------------------------------

export async function listProducts({ user, query }) {
  const pharmacyId = resolvePharmacyId(user, query);
  const where = {
    pharmacyId,
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' } } : {}),
  };
  const total = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    where,
    include: { batches: true },
    orderBy: { createdAt: 'desc' },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
  const batchIds = products.flatMap((p) => p.batches.map((b) => b.id));
  const remaining = await batchRemainingMap(batchIds);
  return {
    data: products.map((p) => serializeProductInventory(p, remaining)),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) || 1 },
  };
}

export async function getProduct({ user, productId }) {
  const pharmacyId = resolvePharmacyId(user, { pharmacyId: null });
  const product = await prisma.product.findFirst({
    where: { id: productId, pharmacyId },
    include: { batches: true },
  });
  if (!product) throw new AppError(ErrorCodes.NOT_FOUND);
  const remaining = await batchRemainingMap(product.batches.map((b) => b.id));
  return serializeProductInventory(product, remaining);
}

export async function createProduct({ user, data }) {
  const pharmacyId = resolvePharmacyId(user, data);
  const productData = pick(data, PRODUCT_FIELDS);
  const hasInitial = data.initialQuantity != null || data.batchNumber != null || data.expiryDate != null;

  const { product, batchId } = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: { ...productData, pharmacyId } });
    let batchId = null;
    if (hasInitial) {
      const batch = await tx.productBatch.create({
        data: {
          productId: product.id,
          ...pick(data, BATCH_FIELDS),
          expiryDate: data.expiryDate ? parseDate(data.expiryDate) : null,
        },
      });
      batchId = batch.id;
      if (data.initialQuantity != null) {
        await tx.stockMovement.create({
          data: { batchId: batch.id, type: 'RECEIPT', quantity: data.initialQuantity },
        });
      }
    }
    return { product, batchId };
  });

  return { id: product.id, ...(batchId ? { batchId } : {}) };
}

export async function updateProduct({ user, productId, data }) {
  const pharmacyId = resolvePharmacyId(user, { pharmacyId: null });
  await assertProductScope(productId, pharmacyId);
  const product = await prisma.product.update({
    where: { id: productId },
    data: pick(data, PRODUCT_FIELDS),
    include: { batches: true },
  });
  const remaining = await batchRemainingMap(product.batches.map((b) => b.id));
  return serializeProductInventory(product, remaining);
}

// --- Batches -----------------------------------------------------------------

export async function listBatches({ user, productId }) {
  const pharmacyId = resolvePharmacyId(user, { pharmacyId: null });
  const product = await prisma.product.findFirst({ where: { id: productId, pharmacyId }, include: { batches: true } });
  if (!product) throw new AppError(ErrorCodes.NOT_FOUND);
  const remaining = await batchRemainingMap(product.batches.map((b) => b.id));
  return product.batches
    .map((b) => serializeBatch(b, remaining.get(b.id) ?? 0))
    .sort((a, b) => (b.receivedAt?.getTime() ?? 0) - (a.receivedAt?.getTime() ?? 0));
}

export async function createBatch({ user, productId, data }) {
  const pharmacyId = resolvePharmacyId(user, { pharmacyId: null });
  const product = await prisma.product.findFirst({ where: { id: productId, pharmacyId } });
  if (!product) throw new AppError(ErrorCodes.NOT_FOUND);

  return prisma.$transaction(async (tx) => {
    const batch = await tx.productBatch.create({
      data: {
        productId,
        ...pick(data, BATCH_FIELDS),
        expiryDate: data.expiryDate ? parseDate(data.expiryDate) : null,
      },
    });
    if (data.initialQuantity != null) {
      await tx.stockMovement.create({
        data: { batchId: batch.id, type: 'RECEIPT', quantity: data.initialQuantity },
      });
    }
    return batch;
  }).then(async (batch) => {
    const remaining = await batchRemainingMap([batch.id]);
    return serializeBatch(batch, remaining.get(batch.id) ?? 0);
  });
}

export async function updateBatch({ user, batchId, data }) {
  const pharmacyId = resolvePharmacyId(user, { pharmacyId: null });
  const existing = await prisma.productBatch.findUnique({ where: { id: batchId }, include: { product: true } });
  if (!existing) throw new AppError(ErrorCodes.NOT_FOUND);
  if (existing.product.pharmacyId !== pharmacyId) throw new AppError(ErrorCodes.TENANT_SCOPE);

  const merged = { ...pick(data, BATCH_FIELDS) };
  if (data.expiryDate !== undefined) merged.expiryDate = data.expiryDate ? parseDate(data.expiryDate) : null;
  const batch = await prisma.productBatch.update({ where: { id: batchId }, data: merged });
  const remaining = await batchRemainingMap([batch.id]);
  return serializeBatch(batch, remaining.get(batch.id) ?? 0);
}

// --- Movements ---------------------------------------------------------------

export async function createMovement({ user, data }) {
  const batch = await prisma.productBatch.findUnique({
    where: { id: data.batchId },
    include: { product: true },
  });
  if (!batch) throw new AppError(ErrorCodes.NOT_FOUND);
  if (user.role !== 'ADMIN' && batch.product.pharmacyId !== user.pharmacyId) {
    throw new AppError(ErrorCodes.TENANT_SCOPE);
  }

  if (data.type === 'ADJUSTMENT' && !data.direction) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'direction is required for ADJUSTMENT', {
      details: [{ field: 'direction', message: 'direction (INCREASE|DECREASE) is required when type is ADJUSTMENT' }],
    });
  }

  const remaining = await batchRemainingMap([data.batchId]);
  const current = remaining.get(data.batchId) ?? 0;
  const delta = signOf(data.type, data.direction) * data.quantity;
  if (current + delta < 0) throw new AppError(ErrorCodes.NEGATIVE_STOCK);

  const created = await prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        batchId: data.batchId,
        type: data.type,
        quantity: data.quantity,
        direction: data.direction ?? null,
        counterpartyName: data.counterpartyName ?? null,
        counterpartyAddress: data.counterpartyAddress ?? null,
        referenceNumber: data.referenceNumber ?? null,
        prescriptionNumber: data.prescriptionNumber ?? null,
        reason: data.reason ?? null,
        performedByUserId: user.id,
        occurredAt: data.occurredAt ?? new Date(),
      },
    });
    let lossReportId = null;
    if (data.type === 'LOSS') {
      const report = await tx.lossReport.create({
        data: { movementId: movement.id, circumstances: data.reason ?? 'Damaged stock' },
      });
      lossReportId = report.id;
    }
    return { movement, lossReportId };
  });

  return { id: created.movement.id, newBatchStock: current + delta, lossReportId: created.lossReportId };
}

export async function listMovements({ user, query }) {
  const pharmacyScope = user.role === 'ADMIN' && query.pharmacyId;
  const where = {
    ...(query.batchId ? { batchId: query.batchId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.from || query.to
      ? {
          occurredAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
    batch: {
      ...(query.productId ? { productId: query.productId } : {}),
      product: pharmacyScope ? { pharmacyId: query.pharmacyId } : { pharmacyId: user.pharmacyId },
    },
  };

  const total = await prisma.stockMovement.count({ where });
  const movements = await prisma.stockMovement.findMany({
    where,
    include: { batch: { include: { product: true } }, performedBy: true },
    orderBy: { occurredAt: 'desc' },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return {
    data: movements.map(serializeMovement),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) || 1 },
  };
}

export async function exportMovements({ user, query }) {
  const where = {
    batch: { product: user.role === 'ADMIN' && query.pharmacyId ? { pharmacyId: query.pharmacyId } : { pharmacyId: user.pharmacyId } },
  };
  const movements = await prisma.stockMovement.findMany({
    where,
    include: { batch: { include: { product: true } } },
    orderBy: { occurredAt: 'asc' },
  });
  const lines = movements.map((m) => [
    isoDate(m.occurredAt),
    m.batch.product.name ?? '',
    m.batch.batchNumber ?? '',
    m.type,
    String(m.quantity),
    m.referenceNumber ?? '',
    m.counterpartyName ?? '',
    m.reason ?? '',
  ]);
  return toCsv(['date', 'product', 'batch', 'type', 'quantity', 'reference', 'counterparty', 'reason'], lines);
}

function toCsv(headers, rows) {
  const esc = (value) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(esc).join(',')).join('\n');
}

// --- Dashboard ----------------------------------------------------------------

export async function dashboard({ user }) {
  const productWhere = user.role === 'ADMIN' ? {} : { pharmacyId: user.pharmacyId };
  const movementWhere = user.role === 'ADMIN' ? {} : { batch: { product: { pharmacyId: user.pharmacyId } } };

  const [products, batches, recent] = await Promise.all([
    prisma.product.findMany({ where: productWhere, include: { batches: true } }),
    prisma.productBatch.findMany({ where: { product: productWhere } }),
    prisma.stockMovement.findMany({
      where: movementWhere,
      include: { batch: { include: { product: true } }, performedBy: true },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    }),
  ]);

  const remaining = await batchRemainingMap(products.flatMap((p) => p.batches.map((b) => b.id)));
  const views = products.map((p) => serializeProductInventory(p, remaining));

  return {
    totals: { products: products.length, batches: batches.length },
    lowStock: views.filter((v) => v.isLowStock),
    expired: views.filter((v) => v.expiry.status === 'EXPIRED'),
    expiringSoon: views.filter((v) => v.expiry.status === 'EXPIRING'),
    recentMovements: recent.map(serializeMovement),
  };
}