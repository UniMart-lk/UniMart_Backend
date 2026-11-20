import prisma from '../config/prisma.js';

const homeMarketplaceSelect = {
  id: true,
  title: true,
  description: true,
  condition: true,
  price: true,
  location: true,
  status: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    select: {
      id: true,
      imageUrl: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  },
  provider: {
    select: {
      id: true,
      displayName: true,
      providerType: true,
      verificationStatus: true,
      overallRating: true,
      totalReviews: true,
    },
  },
};

const homeRentalSelect = {
  id: true,
  title: true,
  rentalPrice: true,
  rentalPeriod: true,
  itemType: true,
  condition: true,
  status: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    select: {
      id: true,
      imageUrl: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  },
  vehicleDetail: {
    select: {
      vehicleType: true,
      makeModel: true,
      pickupLocationName: true,
      latitude: true,
      longitude: true,
    },
  },
  equipmentDetail: {
    select: {
      equipmentType: true,
      pickupLocationName: true,
    },
  },
};

class HomeService {}
