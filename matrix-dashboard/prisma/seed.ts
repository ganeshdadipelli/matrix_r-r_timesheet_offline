// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const districts = [
  { name: 'Visakhapatnam', code: 'VZM', sortOrder: 1 },
  { name: 'Srikakulam',    code: 'SKL', sortOrder: 2 },
  { name: 'Vizianagaram',  code: 'VZG', sortOrder: 3 },
  { name: 'East Godavari', code: 'EGL', sortOrder: 4 },
  { name: 'West Godavari', code: 'WGL', sortOrder: 5 },
  { name: 'Krishna',       code: 'KRS', sortOrder: 6 },
  { name: 'Guntur',        code: 'GNT', sortOrder: 7 },
  { name: 'Prakasam',      code: 'PKM', sortOrder: 8 },
  { name: 'Chittoor',      code: 'CTR', sortOrder: 9 },
  { name: 'Nellore',       code: 'NLR', sortOrder: 10 },
  { name: 'Kadapa',        code: 'KDP', sortOrder: 11 },
  { name: 'Anantapur',     code: 'ATP', sortOrder: 12 },
  { name: 'Kurnool',       code: 'KNL', sortOrder: 13 },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create districts
  for (const district of districts) {
    await prisma.district.upsert({
      where: { code: district.code },
      update: {},
      create: district,
    });
  }
  console.log('✅ Districts created');

  // Hash passwords
  const superAdminHash = await bcrypt.hash('Admin@123', 12);
  const adminHash      = await bcrypt.hash('Admin@123', 12);
  const fieldHash      = await bcrypt.hash('Field@123', 12);

  const vzm = await prisma.district.findUnique({ where: { code: 'VZM' } });
  const krs = await prisma.district.findUnique({ where: { code: 'KRS' } });

  // Super Admin
  await prisma.user.upsert({
    where: { email: 'superadmin@matrix.com' },
    update: {},
    create: {
      name:         'Super Admin',
      email:        'superadmin@matrix.com',
      passwordHash: superAdminHash,
      role:         UserRole.SUPER_ADMIN,
    },
  });

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@matrix.com' },
    update: {},
    create: {
      name:         'Matrix Admin',
      email:        'admin@matrix.com',
      passwordHash: adminHash,
      role:         UserRole.ADMIN,
    },
  });

  // Field Users
  await prisma.user.upsert({
    where: { email: 'vizag@matrix.com' },
    update: {},
    create: {
      name:         'Vizag Field Officer',
      email:        'vizag@matrix.com',
      passwordHash: fieldHash,
      role:         UserRole.FIELD_USER,
      districtId:   vzm?.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'krishna@matrix.com' },
    update: {},
    create: {
      name:         'Krishna Field Officer',
      email:        'krishna@matrix.com',
      passwordHash: fieldHash,
      role:         UserRole.FIELD_USER,
      districtId:   krs?.id,
    },
  });

  console.log('✅ Users created');
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════');
  console.log('  Super Admin : superadmin@matrix.com / Admin@123');
  console.log('  Admin       : admin@matrix.com      / Admin@123');
  console.log('  Field (VZM) : vizag@matrix.com      / Field@123');
  console.log('  Field (KRS) : krishna@matrix.com    / Field@123');
  console.log('═══════════════════════════════════════');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
