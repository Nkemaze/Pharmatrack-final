import { AppError, ErrorCodes } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import {
  serializePublicPharmacy,
  serializePublicProduct,
} from '../../lib/serializers.js';
import { batchRemainingMap } from '../../lib/stock.js';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

const round1 = (n) => Math.round(n * 10) / 10;

export async function listPharmaciesPublic({ city, nearLat, nearLng }) {
  const where = { status: 'ACTIVE', ...(city ? { city } : {}) };
  const pharmacies = await prisma.pharmacy.findMany({ where, orderBy: { name: 'asc' } });

  if (nearLat != null && nearLng != null) {
    return pharmacies
      .map((pharmacy) => {
        if (pharmacy.latitude == null || pharmacy.longitude == null) {
          return { pharmacy, distanceKm: null };
        }
        const distanceKm = round1(
          haversineKm(Number(nearLat), Number(nearLng), Number(pharmacy.latitude), Number(pharmacy.longitude)),
        );
        return { pharmacy, distanceKm };
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .map(({ pharmacy, distanceKm }) =>
        serializePublicPharmacy(pharmacy, distanceKm === null ? undefined : distanceKm),
      );
  }

  return pharmacies.map((pharmacy) => serializePublicPharmacy(pharmacy));
}

export async function getPharmacyPublic({ pharmacyId }) {
  const pharmacy = await prisma.pharmacy.findFirst({ where: { id: pharmacyId, status: 'ACTIVE' } });
  if (!pharmacy) throw new AppError(ErrorCodes.NOT_FOUND);
  return serializePublicPharmacy(pharmacy);
}

export async function listPharmacyProductsPublic({ pharmacyId, q }) {
  const pharmacy = await prisma.pharmacy.findFirst({ where: { id: pharmacyId, status: 'ACTIVE' } });
  if (!pharmacy) throw new AppError(ErrorCodes.NOT_FOUND);

  const products = await prisma.product.findMany({
    where: {
      pharmacyId,
      isControlled: false,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: { batches: true },
  });
  const remaining = await batchRemainingMap(products.flatMap((p) => p.batches.map((b) => b.id)));
  return products
    .map((p) => serializePublicProduct(p, remaining))
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.name.localeCompare(b.name));
}

export async function searchProductsPublic({ q, limit }) {
  const products = await prisma.product.findMany({
    where: { isControlled: false, pharmacy: { status: 'ACTIVE' }, name: { contains: q, mode: 'insensitive' } },
    include: { batches: true, pharmacy: true },
    orderBy: { name: 'asc' },
    take: limit,
  });
  const remaining = await batchRemainingMap(products.flatMap((p) => p.batches.map((b) => b.id)));
  return products
    .map((p) => serializePublicProduct(p, remaining))
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.name.localeCompare(b.name));
}

export async function popularProducts({ limit }) {
  const products = await prisma.product.findMany({
    where: { isControlled: false, pharmacy: { status: 'ACTIVE' } },
    include: { batches: true },
  });
  const remaining = await batchRemainingMap(products.flatMap((p) => p.batches.map((b) => b.id)));

  const groups = new Map();
  for (const product of products) {
    const stock = product.batches.reduce((sum, b) => sum + (remaining.get(b.id) ?? 0), 0);
    const key = `${product.name}|${product.strength ?? ''}|${product.dosageForm ?? ''}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        name: product.name,
        strength: product.strength,
        dosageForm: product.dosageForm,
        cheapestPrice: null,
        pharmacyIds: new Set(),
        anyInStock: false,
      };
      groups.set(key, group);
    }
    group.pharmacyIds.add(product.pharmacyId);
    if (product.pricePerUnit != null) {
      const price = Number(product.pricePerUnit);
      if (group.cheapestPrice === null || price < Number(group.cheapestPrice)) {
        group.cheapestPrice = product.pricePerUnit.toString();
      }
    }
    if (stock > 0) group.anyInStock = true;
  }

  return [...groups.values()]
    .map((g) => ({
      name: g.name,
      strength: g.strength,
      dosageForm: g.dosageForm,
      cheapestPrice: g.cheapestPrice,
      pharmacyCount: g.pharmacyIds.size,
      anyInStock: g.anyInStock,
    }))
    .sort(
      (a, b) =>
        Number(b.anyInStock) - Number(a.anyInStock) ||
        b.pharmacyCount - a.pharmacyCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}