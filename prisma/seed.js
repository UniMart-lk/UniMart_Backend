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
    { name: 'Books', slug: 'books', type: 'MARKETPLACE', description: 'Textbooks, Notes, Course packs' },
    { name: 'Electronics', slug: 'electronics', type: 'MARKETPLACE', description: 'Phones, Laptops, Gadgets, Calculators' },
    { name: 'Furniture', slug: 'furniture', type: 'MARKETPLACE', description: 'Tables, Chairs, Desks, Racks' },
    { name: 'Clothing', slug: 'clothing', type: 'MARKETPLACE', description: 'Clothes, Shoes, Accessories' },
    { name: 'Stationery', slug: 'stationery', type: 'MARKETPLACE', description: 'Pens, Notebooks, Study items' },
    { name: 'Sports', slug: 'sports', type: 'MARKETPLACE', description: 'Bikes, Gym Gear, Sports Equipment' },
    { name: 'Hostel Essentials', slug: 'hostel-essentials', type: 'MARKETPLACE', description: 'Fans, Kettles, Bedding' },
    { name: 'Other', slug: 'other', type: 'MARKETPLACE', description: 'Other second-hand items' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, type: cat.type, description: cat.description },
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

  // 3. Seed Providers for Mock Data
  // Provider 1: Dilshan Silva (Student)
  const dilshanUser = await prisma.user.upsert({
    where: { email: 'dilshan@campus.ac.lk' },
    update: {},
    create: {
      email: 'dilshan@campus.ac.lk',
      passwordHash: defaultPassword,
      role: 'PROVIDER',
      status: 'ACTIVE',
      emailVerified: true,
      contactNumber: '+94719876543',
      userProfile: {
        create: {
          fullName: 'Dilshan Silva',
          userType: 'STUDENT',
          university: 'Sabaragamuwa University of Sri Lanka',
          faculty: 'Faculty of Applied Sciences',
          universityEmail: 'dilshan@campus.ac.lk',
          universityIdNumber: 'AS/2021/045',
          profilePictureUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
          isCompleted: true,
        },
      },
      providerProfile: {
        create: {
          providerType: 'STUDENT_PROVIDER',
          displayName: 'Dilshan Silva',
          description: 'Undergraduate student selling verified academic textbooks and hostel equipment.',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          overallRating: 4.8,
          totalReviews: 18,
        },
      },
    },
    include: { providerProfile: true },
  });

  // Provider 2: Kasun Perera (External Provider / Tech Vendor)
  const kasunUser = await prisma.user.upsert({
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
          userType: 'EXTERNAL',
          profilePictureUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
          isCompleted: true,
        },
      },
      providerProfile: {
        create: {
          providerType: 'EXTERNAL_PROVIDER',
          displayName: 'Kasun Perera (Campus Tech)',
          description: 'Certified tech seller providing verified gadgets, phones, and accessories for campus students.',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          overallRating: 4.9,
          totalReviews: 25,
        },
      },
    },
    include: { providerProfile: true },
  });

  // Provider 3: Nimal Bandara (Student)
  const nimalUser = await prisma.user.upsert({
    where: { email: 'nimal@campus.ac.lk' },
    update: {},
    create: {
      email: 'nimal@campus.ac.lk',
      passwordHash: defaultPassword,
      role: 'PROVIDER',
      status: 'ACTIVE',
      emailVerified: true,
      contactNumber: '+94772345678',
      userProfile: {
        create: {
          fullName: 'Nimal Bandara',
          userType: 'STUDENT',
          university: 'Sabaragamuwa University',
          faculty: 'Faculty of Social Sciences',
          profilePictureUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
          isCompleted: true,
        },
      },
      providerProfile: {
        create: {
          providerType: 'STUDENT_PROVIDER',
          displayName: 'Nimal Bandara',
          description: 'Final year student passing down reliable furniture and hostel essentials.',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          overallRating: 4.5,
          totalReviews: 14,
        },
      },
    },
    include: { providerProfile: true },
  });

  // Provider 4: Saman Kumara (Student)
  const samanUser = await prisma.user.upsert({
    where: { email: 'saman@campus.ac.lk' },
    update: {},
    create: {
      email: 'saman@campus.ac.lk',
      passwordHash: defaultPassword,
      role: 'PROVIDER',
      status: 'ACTIVE',
      emailVerified: true,
      contactNumber: '+94783456789',
      userProfile: {
        create: {
          fullName: 'Saman Kumara',
          userType: 'STUDENT',
          university: 'Sabaragamuwa University',
          faculty: 'Faculty of Geomatics',
          profilePictureUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80',
          isCompleted: true,
        },
      },
      providerProfile: {
        create: {
          providerType: 'STUDENT_PROVIDER',
          displayName: 'Saman Kumara',
          description: 'Cycling and outdoor sports enthusiast selling well-maintained gear.',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          overallRating: 4.8,
          totalReviews: 30,
        },
      },
    },
    include: { providerProfile: true },
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

  // Fetch category IDs
  const booksCat = await prisma.category.findUnique({ where: { slug: 'books' } });
  const electronicsCat = await prisma.category.findUnique({ where: { slug: 'electronics' } });
  const furnitureCat = await prisma.category.findUnique({ where: { slug: 'furniture' } });
  const sportsCat = await prisma.category.findUnique({ where: { slug: 'sports' } });

  // 5. Seed Marketplace Products (From mockData.js)
  const mockProducts = [
    {
      id: 1,
      title: 'Calculus Textbook',
      price: 1500,
      condition: 'LIKE_NEW',
      location: 'Sabaragamuwa Uni',
      categoryId: booksCat.id,
      providerId: dilshanUser.providerProfile.id,
      description: 'Well-maintained Calculus textbook. No torn pages or heavy highlighting. Perfect for first-year engineering students.',
      details: [
        { label: 'Subject', value: 'Mathematics' },
        { label: 'Edition', value: '10th Edition' },
        { label: 'Author', value: 'Howard Anton' },
        { label: 'Format', value: 'Paperback' },
        { label: 'Condition', value: 'Like New' },
      ],
      locationDetails: {
        address: 'Sabaragamuwa University, Belihuloya',
        mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
      },
      images: [
        { imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80', isPrimary: true },
        { imageUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&q=80', isPrimary: false },
      ],
      reviews: [
        {
          id: 'rev-1-1',
          name: 'Kasun Madushanka',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
          rating: 5,
          date: '2 days ago',
          comment: 'The book is in exceptional condition, just like new as described. No torn pages, and formulas are all intact. Great seller!',
          verified: true,
        },
        {
          id: 'rev-1-2',
          name: 'Malithi Fernando',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
          rating: 5,
          date: '5 days ago',
          comment: 'Saved me a lot of money compared to buying brand new from bookshops. Fast response and handed it over near the Faculty canteen.',
          verified: true,
        },
        {
          id: 'rev-1-3',
          name: 'Dineth Wickramasinghe',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80',
          rating: 4.5,
          date: '1 week ago',
          comment: 'Very clean copy with minimal pencil notes in chapter 3. Very satisfied with the purchase and communication.',
          verified: true,
        },
        {
          id: 'rev-1-4',
          name: 'Sanduni Senanayake',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
          rating: 5,
          date: '2 weeks ago',
          comment: 'Highly recommended for first-year engineering mathematics! Howard Anton 10th edition has all the tutorial problem sets.',
          verified: true,
        },
        {
          id: 'rev-1-5',
          name: 'Tharindu Jayasuriya',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
          rating: 5,
          date: '3 weeks ago',
          comment: 'Super friendly student seller. Handover was smooth at the main library entrance.',
          verified: true,
        },
      ],
    },
    {
      id: 2,
      title: 'iPhone 11 64GB — Black',
      price: 85000,
      condition: 'GOOD',
      location: 'Kandy',
      categoryId: electronicsCat.id,
      providerId: kasunUser.providerProfile.id,
      description: 'Well-maintained iPhone 11, 64GB storage. Battery health 89%. Comes with original charger. Minor scratches on back, screen is flawless. Reason for selling: upgraded.',
      details: [
        { label: 'Brand', value: 'Apple' },
        { label: 'Model', value: 'iPhone 11' },
        { label: 'Storage', value: '64GB' },
        { label: 'Color', value: 'Black' },
        { label: 'Battery Health', value: '89%' },
      ],
      locationDetails: {
        address: 'Kandy, Central Province',
        mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
      },
      images: [
        { imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80', isPrimary: true },
        { imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80', isPrimary: false },
        { imageUrl: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&q=80', isPrimary: false },
      ],
      reviews: [
        {
          id: 'rev-2-1',
          name: 'Sachintha De Silva',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
          rating: 5,
          date: '3 days ago',
          comment: 'Device is in great condition, 89% battery health confirmed via settings. FaceID works flawlessly.',
          verified: true,
        },
        {
          id: 'rev-2-2',
          name: 'Nadeesha Kumari',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
          rating: 5,
          date: '1 week ago',
          comment: 'Seller provided original box and charging cable. Trustworthy and quick deal in Kandy town.',
          verified: true,
        },
        {
          id: 'rev-2-3',
          name: 'Praveen Ratnayake',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80',
          rating: 4.5,
          date: '2 weeks ago',
          comment: 'Cameras take crisp photos, speakers are loud and clear. Very happy with the purchase.',
          verified: true,
        },
      ],
    },
    {
      id: 3,
      title: 'Wooden Study Table',
      price: 8500,
      condition: 'USED',
      location: 'Belihuloya',
      categoryId: furnitureCat.id,
      providerId: nimalUser.providerProfile.id,
      description: 'Sturdy wooden study table. Has a few scratches from normal use but is very strong and perfect for studying.',
      details: [
        { label: 'Material', value: 'Teak Wood' },
        { label: 'Dimensions', value: '4ft x 2.5ft' },
        { label: 'Color', value: 'Natural Brown' },
        { label: 'Condition', value: 'Used' },
      ],
      locationDetails: {
        address: 'Belihuloya, Sabaragamuwa Province',
        mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
      },
      images: [
        { imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80', isPrimary: true },
        { imageUrl: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&q=80', isPrimary: false },
      ],
      reviews: [
        {
          id: 'rev-3-1',
          name: 'Vimukthi Weerasinghe',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
          rating: 5,
          date: '4 days ago',
          comment: 'Very solid and heavy teak wood. Perfect size for my hostel room laptop setup.',
          verified: true,
        },
        {
          id: 'rev-3-2',
          name: 'Janaki Jayawardena',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
          rating: 4.5,
          date: '2 weeks ago',
          comment: 'Good value for money. Handover was easy with help loading into a trishaw.',
          verified: true,
        },
      ],
    },
    {
      id: 4,
      title: 'Mountain Bike',
      price: 22000,
      condition: 'LIKE_NEW',
      location: 'Balangoda',
      categoryId: sportsCat.id,
      providerId: samanUser.providerProfile.id,
      description: '21-speed mountain bike. Recently serviced brakes and tires. Ideal for campus commuting.',
      details: [
        { label: 'Brand', value: 'Trek' },
        { label: 'Type', value: 'Mountain Bike' },
        { label: 'Gear Count', value: '21-Speed' },
        { label: 'Wheel Size', value: '27.5 inch' },
        { label: 'Brakes', value: 'Disc Brakes' },
      ],
      locationDetails: {
        address: 'Balangoda, Sabaragamuwa Province',
        mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
      },
      images: [
        { imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80', isPrimary: true },
      ],
      reviews: [
        {
          id: 'rev-4-1',
          name: 'Avishka Dilshan',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
          rating: 5,
          date: '5 days ago',
          comment: 'Tackles the Sabaragamuwa university hills effortlessly! Brakes and gear shifts are super responsive.',
          verified: true,
        },
        {
          id: 'rev-4-2',
          name: 'Chamathka Karunaratne',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
          rating: 5,
          date: '1 week ago',
          comment: 'Bike came freshly tuned with free bell and reflector attached. Great deal!',
          verified: true,
        },
      ],
    },
  ];

  for (const prod of mockProducts) {
    const { images, ...prodData } = prod;

    const createdProd = await prisma.marketplaceProduct.upsert({
      where: { id: prodData.id },
      update: {
        title: prodData.title,
        price: prodData.price,
        condition: prodData.condition,
        location: prodData.location,
        categoryId: prodData.categoryId,
        providerId: prodData.providerId,
        description: prodData.description,
        details: prodData.details,
        locationDetails: prodData.locationDetails,
        reviews: prodData.reviews,
        status: 'AVAILABLE',
      },
      create: {
        id: prodData.id,
        title: prodData.title,
        price: prodData.price,
        condition: prodData.condition,
        location: prodData.location,
        categoryId: prodData.categoryId,
        providerId: prodData.providerId,
        description: prodData.description,
        details: prodData.details,
        locationDetails: prodData.locationDetails,
        reviews: prodData.reviews,
        status: 'AVAILABLE',
      },
    });

    // Delete existing images for clean seed
    await prisma.productImage.deleteMany({
      where: { productId: createdProd.id },
    });

    // Add images
    for (const img of images) {
      await prisma.productImage.create({
        data: {
          productId: createdProd.id,
          imageUrl: img.imageUrl,
          isPrimary: img.isPrimary,
        },
      });
    }
  }

  console.log('🎉 Seeding finished successfully! All 4 mock products are now in database.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
