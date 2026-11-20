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
  assets: {
    select: {
      id: true,
      status: true,
    },
  },
  provider: {
    select: {
      id: true,
      displayName: true,
      providerType: true,
      overallRating: true,
      totalReviews: true,
    },
  },
};

function formatMarketplaceProduct(product) {
  const primaryImage = product.images?.[0]?.imageUrl || null;
  const allImages = product.images?.map((img) => img.imageUrl) || [];
  const numericPrice = Number(product.price);

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    condition: product.condition === 'LIKE_NEW' ? 'Like New' : product.condition,
    price: `Rs. ${numericPrice.toLocaleString()}`,
    numericPrice: numericPrice,
    location: product.location || 'Campus',
    category: product.category?.name || 'General',
    providerType: product.provider?.providerType === 'EXTERNAL_PROVIDER' ? 'external' : 'student',
    providerName: product.provider?.displayName || 'UniMart Seller',
    rating: Number(product.provider?.overallRating || 4.8).toFixed(1),
    reviewsCount: product.provider?.totalReviews || 0,
    images: allImages.length > 0 ? allImages : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80'],
    primaryImageUrl: primaryImage,
    createdAt: product.createdAt,
  };
}

class HomeService {}
