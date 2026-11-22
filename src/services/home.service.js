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

function formatRentalListing(rental) {
  const primaryImage = rental.images?.[0]?.imageUrl || null;
  const numericPrice = Number(rental.rentalPrice);
  const period = (rental.rentalPeriod || 'DAILY').toLowerCase();
  const location =
    rental.vehicleDetail?.pickupLocationName ||
    rental.equipmentDetail?.pickupLocationName ||
    'Main Library · Campus';

  const totalAssets = rental.assets?.length || 0;
  const availableAssets = rental.assets?.filter((a) => a.status === 'AVAILABLE').length || 0;
  const availabilityText =
    totalAssets > 0
      ? availableAssets > 0
        ? 'Available this week'
        : 'Currently rented'
      : 'Available this week';

  return {
    id: rental.id,
    title: rental.title,
    rentalPrice: numericPrice,
    rentalPeriod: period,
    priceFormatted: `Rs. ${numericPrice.toLocaleString()}/${period === 'daily' ? 'day' : period}`,
    itemType: rental.itemType,
    condition: rental.condition,
    primaryImageUrl: primaryImage || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80',
    location: location,
    availability: availabilityText,
    rating: Number(rental.provider?.overallRating || 4.8).toFixed(1),
    reviewsCount: rental.provider?.totalReviews || 24,
    providerType: rental.provider?.providerType === 'EXTERNAL_PROVIDER' ? 'external' : 'student',
    providerName: rental.provider?.displayName || 'Campus Provider',
    totalAssets,
    availableAssets,
    createdAt: rental.createdAt,
  };
}

class HomeService {
  async getFeaturedMarketplace(limit = 10) {
    const products = await prisma.marketplaceProduct.findMany({
      where: { status: 'AVAILABLE' },
      select: homeMarketplaceSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return products.map(formatMarketplaceProduct);
  }
  async getFeaturedRentals(limit = 10) {
    const rentals = await prisma.rentalListing.findMany({
      where: { status: 'ACTIVE' },
      select: homeRentalSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rentals.map(formatRentalListing);
  }
  async getCategories() {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        _count: {
          select: {
            marketplaceProducts: true,
            rentalListings: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      type: cat.type,
      totalListings: (cat._count?.marketplaceProducts || 0) + (cat._count?.rentalListings || 0),
    }));
  }
  async getUserSummary(userId) {
    if (!userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        userProfile: {
          select: {
            fullName: true,
            userType: true,
            profilePictureUrl: true,
          },
        },
        providerProfile: {
          select: {
            id: true,
            displayName: true,
            providerType: true,
            overallRating: true,
          },
        },
      },
    });
    if (!user) return null;
    const unreadNotifications = await prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
    const unreadMessages = await prisma.message.count({
      where: { receiverId: userId, isRead: false },
    });
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.userProfile?.fullName || user.providerProfile?.displayName || 'Kasun',
      userType: user.userProfile?.userType || 'STUDENT',
      avatarUrl: user.userProfile?.profilePictureUrl || null,
      isProvider: user.role === 'PROVIDER' || user.role === 'ADMIN' || !!user.providerProfile,
      unreadNotifications,
      unreadMessages,
    };
  }
  async getPlatformStats() {
    const [totalProducts, totalRentals] = await Promise.all([
      prisma.marketplaceProduct.count({ where: { status: 'AVAILABLE' } }),
      prisma.rentalListing.count({ where: { status: 'ACTIVE' } }),
    ]);
    return { totalProducts, totalRentals };
  }
  async getHomeFeed(userId, options = {}) {
    const limit = options.limit || 10;
    const [featuredMarketplace, featuredRentals, categories, userSummary, stats] =
      await Promise.all([
        this.getFeaturedMarketplace(limit),
        this.getFeaturedRentals(limit),
        this.getCategories(),
        this.getUserSummary(userId),
        this.getPlatformStats(),
      ]);

    return {
      userSummary,
      featuredMarketplace,
      featuredRentals,
      categories,
      stats,
    };
  }
}

export default new HomeService();
