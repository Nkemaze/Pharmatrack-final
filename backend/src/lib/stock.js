import { prisma } from './prisma.js';

export const MovementTypes = [
  'RECEIPT',
  'SALE',
  'RETURN',
  'TRANSFER',
  'ADJUSTMENT',
  'DESTRUCTION',
  'LOSS',
];
export const AdjustmentDirections = ['INCREASE', 'DECREASE'];

export function signOf(type, direction) {
  switch (type) {
    case 'RECEIPT':
    case 'RETURN':
      return 1;
    case 'ADJUSTMENT':
      return direction === 'INCREASE' ? 1 : -1;
    default: // SALE, TRANSFER, DESTRUCTION, LOSS
      return -1;
  }
}

export async function batchRemainingMap(batchIds) {
  const remaining = new Map(batchIds.map((id) => [id, 0]));
  if (batchIds.length === 0) return remaining;

  const movements = await prisma.stockMovement.findMany({
    where: { batchId: { in: batchIds } },
    select: { batchId: true, type: true, direction: true, quantity: true },
  });
  for (const m of movements) {
    remaining.set(
      m.batchId,
      (remaining.get(m.batchId) ?? 0) + signOf(m.type, m.direction) * m.quantity,
    );
  }
  return remaining;
}