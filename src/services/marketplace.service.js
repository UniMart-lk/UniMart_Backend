import prisma from '../config/prisma.js';

// Specific fields selected for the marketplace feed card and performance
const marketplaceFeedSelect = {
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
      overallRating: true,
      totalReviews: true,
      verificationStatus: true,
    },
  },
};

const conditionMap = {
  NEW: 'New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
};

class MarketplaceService {
  /**
   * Get active marketplace product listings for the feed
   * Supports filtering by category, search term, sorting, and cursor-based pagination
   * @param {Object} options - { limit, cursor, category, search, sort }
   * @returns {Object} { products, nextCursor, totalCount }
   */
  async getMarketplaceFeed({ limit = 20, cursor, category, search, sort = 'Newest' } = {}) {
    const where = {
      status: 'AVAILABLE',
    };

    // Category filter (support category name or slug; ignore 'All')
    if (category && category !== 'All') {
      where.category = {
        OR: [
          { name: { equals: category } },
          { slug: { equals: category.toLowerCase().replace(/\s+/g, '-') } },
        ],
      };
    }

    // Search query filter (search in title or description)
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        { title: { contains: searchTerm } },
        { description: { contains: searchTerm } },
      ];
    }

    // Sorting options matching frontend: 'Newest', 'Price: Low to High', 'Price: High to Low', 'Highest Rated'
    let orderBy = [{ id: 'desc' }];
    if (sort === 'Price: Low to High') {
      orderBy = [{ price: 'asc' }, { id: 'desc' }];
    } else if (sort === 'Price: High to Low') {
      orderBy = [{ price: 'desc' }, { id: 'desc' }];
    } else if (sort === 'Highest Rated') {
      orderBy = [{ provider: { overallRating: 'desc' } }, { id: 'desc' }];
    }

    // Cursor condition: when ordering by newest, use id < cursor
    if (cursor && (sort === 'Newest' || !sort)) {
      where.id = { lt: cursor };
    }

    const listings = await prisma.marketplaceProduct.findMany({
      where,
      select: marketplaceFeedSelect,
      orderBy,
      take: limit + 1,
    });

    const hasMore = listings.length > limit;
    const page = hasMore ? listings.slice(0, limit) : listings;

    return {
      products: page.map(toFeedItem),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /**
   * Get single marketplace product by ID
   * @param {number} id
   * @returns {Object|null}
   */
  async getProductById(id) {
    const product = await prisma.marketplaceProduct.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                contactNumber: true,
                userProfile: {
                  select: {
                    fullName: true,
                    profilePictureUrl: true,
                    university: true,
                    userType: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) return null;

    return toDetailedProduct(product);
  }

  /**
   * Get all active marketplace categories
   * @returns {Array}
   */
  async getCategories() {
    return prisma.category.findMany({
      where: {
        type: 'MARKETPLACE',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}

/**
 * Format a database product into the shape expected by MarketplaceHomeScreen and ProductCard
 */
function toFeedItem(product) {
  const numericPrice = Number(product.price);
  const images = (product.images || []).map((img) => img.imageUrl);
  const isExternal = product.provider?.providerType === 'EXTERNAL_PROVIDER';

  return {
    id: product.id.toString(),
    numericId: product.id,
    title: product.title,
    description: product.description,
    price: `LKR ${numericPrice.toLocaleString()}`,
    numericPrice,
    condition: conditionMap[product.condition] || product.condition,
    rawCondition: product.condition,
    location: product.location,
    status: product.status,
    category: product.category?.name || 'General',
    categorySlug: product.category?.slug || '',
    images: images.length > 0 ? images : ['https://via.placeholder.com/300?text=No+Image'],
    providerType: isExternal ? 'external' : 'student',
    rating: product.provider?.overallRating ? Number(product.provider.overallRating).toFixed(1) : '5.0',
    reviewsCount: product.provider?.totalReviews ? product.provider.totalReviews.toString() : '0',
    provider: product.provider
      ? {
          id: product.provider.id,
          name: product.provider.displayName,
          type: isExternal ? 'External Provider' : 'Student Provider',
          isVerified: product.provider.verificationStatus === 'VERIFIED',
          rating: product.provider.overallRating ? Number(product.provider.overallRating).toFixed(1) : '5.0',
          reviewsCount: product.provider.totalReviews || 0,
        }
      : null,
    createdAt: product.createdAt,
  };
}

/**
 * Format full product for ProductDetailsScreen
 */
function toDetailedProduct(product) {
  const feedItem = toFeedItem(product);
  const userProfile = product.provider?.user?.userProfile;

  return {
    ...feedItem,
    locationDetails: {
      address: product.location,
      mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
    },
    provider: {
      ...feedItem.provider,
      avatar: userProfile?.profilePictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80',
      university: userProfile?.university || null,
      contactNumber: product.provider?.user?.contactNumber || null,
      memberSince: product.provider?.createdAt
        ? new Date(product.provider.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '2025',
    },
  };
}

export default new MarketplaceService();
