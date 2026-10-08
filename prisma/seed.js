import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Seed Categories
  const categories = [
    { name: 'Vehicles', slug: 'vehicles', type: 'RENTAL', description: 'Motorcycles, Bicycles, Cars' },
    { name: 'Event & Camping Equipment', slug: 'equipment', type: 'RENTAL', description: 'Tents, Projectors, Speakers' },
    { name: 'Electronics & Gadgets', slug: 'electronics', type: 'MARKETPLACE', description: 'Calculators, Monitors, Keyboards' },
    { name: 'Textbooks & Notes', slug: 'books', type: 'MARKETPLACE', description: 'Course books, Study packs' },
    { name: 'Hostel Essentials', slug: 'hostel-essentials', type: 'MARKETPLACE', description: 'Fans, Kettles, Bedding' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // 2. Seed Admin User
  await prisma.user.upsert({
    where: { email: 'admin@unimart.com' },
    update: {},
    create: {
      email: 'admin@unimart.com',
      passwordHash: defaultPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      userProfile: {
        create: {
          fullName: 'UniMart System Admin',
          userType: 'EXTERNAL',
          isCompleted: true,
        },
      },
    },
  });

  // 3. Seed Verified Student Provider
  await prisma.user.upsert({
    where: { email: 'provider@campus.ac.lk' },
    update: {},
    create: {
      email: 'provider@campus.ac.lk',
      passwordHash: defaultPassword,
      role: 'PROVIDER',
      status: 'ACTIVE',
      emailVerified: true,
      contactNumber: '+94711234567',
      userProfile: {
        create: {
          fullName: 'Kasun Perera',
          userType: 'STUDENT',
          university: 'University of Colombo',
          faculty: 'Faculty of Science',
          universityEmail: 'provider@campus.ac.lk',
          universityIdNumber: 'SC/2021/8901',
          isCompleted: true,
        },
      },
      providerProfile: {
        create: {
          providerType: 'STUDENT_PROVIDER',
          displayName: 'Campus Gear & Rentals',
          description: 'Verified student provider for campus bikes and study gear.',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          overallRating: 5.0,
          totalReviews: 1,
        },
      },
    },
  });

  // 4. Seed Regular User
  await prisma.user.upsert({
    where: { email: 'renter@campus.ac.lk' },
    update: {},
    create: {
      email: 'renter@campus.ac.lk',
      passwordHash: defaultPassword,
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      contactNumber: '+94779876543',
      userProfile: {
        create: {
          fullName: 'Nimali Silva',
          userType: 'STUDENT',
          university: 'University of Colombo',
          faculty: 'Faculty of Arts',
          universityEmail: 'renter@campus.ac.lk',
          universityIdNumber: 'AR/2022/4512',
          isCompleted: true,
        },
      },
    },
  });

  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
