export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    pharmacyId: user.pharmacyId,
    mustUpdateProfile: user.mustUpdateProfile,
  };
}

export function serializePharmacy(pharmacy) {
  return {
    id: pharmacy.id,
    name: pharmacy.name,
    address: pharmacy.address,
    city: pharmacy.city,
    state: pharmacy.state,
    zipCode: pharmacy.zipCode,
    phone: pharmacy.phone,
    email: pharmacy.email,
    emergencyPhone: pharmacy.emergencyPhone,
    emergencyDesc: pharmacy.emergencyDesc,
    latitude: pharmacy.latitude?.toString() ?? null,
    longitude: pharmacy.longitude?.toString() ?? null,
    openingHours: pharmacy.openingHours,
    updatedAt: pharmacy.updatedAt,
  };
}

export const isoDate = (d) => d.toISOString().slice(0, 10);

function utcToday() {
  const t = new Date();
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

export const EXPIRING_THRESHOLD_DAYS = 90;

export function serializeBatch(batch, remaining) {
  return {
    id: batch.id,
    batchNumber: batch.batchNumber,
    expiryDate: batch.expiryDate ? isoDate(batch.expiryDate) : null,
    receivedAt: batch.receivedAt,
    remaining,
  };
}

export function serializeProductInventory(product, remainingMap) {
  const batches = product.batches ?? [];
  const totalStock = batches.reduce((sum, b) => sum + (remainingMap.get(b.id) ?? 0), 0);
  const dated = batches
    .filter((b) => b.expiryDate && (remainingMap.get(b.id) ?? 0) > 0)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  const minExpiry = dated[0]?.expiryDate ?? null;
  const today = utcToday();
  const daysToExpiry = minExpiry ? Math.floor((minExpiry.getTime() - today) / 86_400_000) : null;

  let status = 'HEALTHY';
  if (minExpiry) {
    if (minExpiry.getTime() < today) status = 'EXPIRED';
    else if (daysToExpiry <= EXPIRING_THRESHOLD_DAYS) status = 'EXPIRING';
  }

  return {
    id: product.id,
    pharmacyId: product.pharmacyId,
    name: product.name,
    category: product.category,
    strength: product.strength,
    dosageForm: product.dosageForm,
    barcode: product.barcode,
    requiresPrescription: product.requiresPrescription,
    isControlled: product.isControlled,
    pricePerUnit: product.pricePerUnit?.toString() ?? null,
    pricePerPacket: product.pricePerPacket?.toString() ?? null,
    packetSize: product.packetSize,
    unitLabel: product.unitLabel ?? 'unit',
    imageUrl: product.imageUrl,
    lowStockThreshold: product.lowStockThreshold,
    totalStock,
    isLowStock: product.lowStockThreshold != null && totalStock <= product.lowStockThreshold,
    expiry: {
      status,
      daysToExpiry,
      minExpiryDate: minExpiry ? isoDate(minExpiry) : null,
    },
    batchCount: batches.length,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function serializePublicProduct(product, remainingMap) {
  const totalStock = (product.batches ?? []).reduce(
    (sum, b) => sum + (remainingMap.get(b.id) ?? 0),
    0,
  );
  return {
    id: product.id,
    pharmacyId: product.pharmacyId,
    pharmacyName: product.pharmacy?.name ?? null,
    city: product.pharmacy?.city ?? null,
    name: product.name,
    category: product.category,
    strength: product.strength,
    dosageForm: product.dosageForm,
    requiresPrescription: product.requiresPrescription,
    pricePerUnit: product.pricePerUnit?.toString() ?? null,
    pricePerPacket: product.pricePerPacket?.toString() ?? null,
    packetSize: product.packetSize,
    unitLabel: product.unitLabel ?? 'unit',
    imageUrl: product.imageUrl,
    inStock: totalStock > 0,
  };
}

export function serializeMovement(movement) {
  return {
    id: movement.id,
    batchId: movement.batchId,
    product: {
      id: movement.batch?.product?.id ?? null,
      name: movement.batch?.product?.name ?? null,
    },
    type: movement.type,
    quantity: movement.quantity,
    direction: movement.direction,
    counterpartyName: movement.counterpartyName,
    counterpartyAddress: movement.counterpartyAddress,
    referenceNumber: movement.referenceNumber,
    prescriptionNumber: movement.prescriptionNumber,
    reason: movement.reason,
    performedBy: movement.performedBy
      ? { id: movement.performedBy.id, name: movement.performedBy.name }
      : null,
    occurredAt: movement.occurredAt,
    recordedAt: movement.recordedAt,
  };
}