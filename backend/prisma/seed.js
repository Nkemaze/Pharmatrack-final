import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

const DEMO_PHARMACIES = [
  {
    name: 'Pharmacie du Centre',
    city: 'Yaoundé',
    address: '12 Avenue Kennedy',
    phone: '+237 222 22 22 22',
    latitude: '3.866667',
    longitude: '11.516667',
    email: 'centre@pharmatrack.local',
    products: [
      { name: 'Paracétamol', category: 'Analgésique', strength: '500 mg', dosageForm: 'Tablet', pricePerUnit: '500', pricePerPacket: '1250', packetSize: 10, quantity: 200, batchNumber: 'PC-001', expiryDate: '2027-08-17' },
      { name: 'Amoxicilline', category: 'Antibiotique', strength: '500 mg', dosageForm: 'Capsule', requiresPrescription: true, pricePerUnit: '900', quantity: 120, batchNumber: 'PC-002', expiryDate: '2026-12-01' },
      { name: 'Artéméther/Luméfantrine', category: 'Antipaludique', strength: '20/120 mg', dosageForm: 'Tablet', pricePerUnit: '1500', quantity: 60, batchNumber: 'PC-003', expiryDate: '2027-03-30' },
    ],
  },
  {
    name: 'Pharmacie de la Paix',
    city: 'Douala',
    address: 'Boulevard de la Liberté',
    phone: '+237 233 33 33 33',
    latitude: '4.051056',
    longitude: '9.767869',
    email: 'paix@pharmatrack.local',
    products: [
      { name: 'Paracétamol', category: 'Analgésique', strength: '500 mg', dosageForm: 'Tablet', pricePerUnit: '450', pricePerPacket: '1100', packetSize: 10, quantity: 300, batchNumber: 'LP-001', expiryDate: '2027-10-10' },
      { name: 'Ibuprofène', category: 'Anti-inflammatoire', strength: '400 mg', dosageForm: 'Tablet', pricePerUnit: '600', quantity: 90, batchNumber: 'LP-002', expiryDate: '2026-09-15' },
    ],
  },
];

async function upsertAdmin() {
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin#12345', rounds);
  const admin = await prisma.user.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      email: 'admin@pharmatrack.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash,
    },
  });
  console.log(`  admin user: ${admin.name}`);
}

async function seedPharmacy(data) {
  let pharmacy = await prisma.pharmacy.findFirst({ where: { name: data.name } });
  if (!pharmacy) {
    pharmacy = await prisma.pharmacy.create({
      data: {
        name: data.name,
        city: data.city,
        address: data.address,
        phone: data.phone,
        email: data.email,
        latitude: data.latitude,
        longitude: data.longitude,
        status: 'ACTIVE',
      },
    });
  }

  const pharmacistName = `${data.name} pharmacist`;
  const user = await prisma.user.findFirst({ where: { pharmacyId: pharmacy.id, role: 'PHARMACY' } });
  if (!user) {
    await prisma.user.create({
      data: {
        name: pharmacistName,
        email: data.email,
        role: 'PHARMACY',
        status: 'ACTIVE',
        pharmacyId: pharmacy.id,
        passwordHash: await bcrypt.hash('Pharma#12345', rounds),
      },
    });
  }

  for (const p of data.products) {
    const existing = await prisma.product.findFirst({
      where: { pharmacyId: pharmacy.id, name: p.name, strength: p.strength },
    });
    if (existing) continue;

    const product = await prisma.product.create({
      data: {
        pharmacyId: pharmacy.id,
        name: p.name,
        category: p.category,
        strength: p.strength,
        dosageForm: p.dosageForm,
        requiresPrescription: p.requiresPrescription ?? false,
        pricePerUnit: p.pricePerUnit,
        pricePerPacket: p.pricePerPacket,
        packetSize: p.packetSize,
      },
    });

    const batch = await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: p.batchNumber,
        expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
      },
    });

    await prisma.stockMovement.create({
      data: {
        batchId: batch.id,
        type: 'RECEIPT',
        quantity: p.quantity,
        counterpartyName: 'Fournisseur initial',
      },
    });
  }

  console.log(`  pharmacy: ${pharmacy.name} (${data.products.length} products)`);
}

async function main() {
  console.log('Seeding PharmaTrack demo data...');
  await upsertAdmin();
  for (const pharmacy of DEMO_PHARMACIES) {
    await seedPharmacy(pharmacy);
  }
  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());