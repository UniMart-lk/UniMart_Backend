import prisma from '../config/prisma.js';

// Condition bidirectional mapping
const conditionMap = {
  NEW: 'New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
  USED: 'Used',
};

const reverseConditionMap = {
  New: 'NEW',
  'Like New': 'LIKE_NEW',
  Good: 'GOOD',
  Fair: 'FAIR',
  Used: 'USED',
  new: 'NEW',
  like_new: 'LIKE_NEW',
  good: 'GOOD',
  fair: 'FAIR',
  used: 'USED',
};

// Selection of fields for product feed and listings
const marketplaceProductSelect = {
  id: true,
  title: true,
  description: true,
  condition: true,
  price: true,
  location: true,
  status: true,
  details: true,
  locationDetails: true,
  allowNegotiation: true,
  reviews: true,
  viewsCount: true,
  inquiriesCount: true,
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
      createdAt: true,
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
};

class MarketplaceService {
  /**
   * Get active marketplace product listings for the feed
   * Supports filtering by category, search term, price range, condition, rating, providerType, and sorting
   * @param {Object} options
   * @returns {Object} { products, nextCursor, totalCount }
   */
  async getMarketplaceFeed({
    limit = 20,
    cursor,
    category,
    search,
    sort = 'Newest',
    maxPrice,
    conditions,
    minRating,
    providerType,
  } = {}) {
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

    // Max price filter
    if (maxPrice !== undefined && maxPrice !== null && !isNaN(Number(maxPrice))) {
      where.price = { lte: Number(maxPrice) };
    }

    // Conditions filter (e.g., ['Like New', 'Good'])
    if (conditions) {
      const condArray = Array.isArray(conditions)
        ? conditions
        : typeof conditions === 'string'
        ? conditions.split(',').map((c) => c.trim())
        : [];

      if (condArray.length > 0) {
        const mappedConditions = condArray
          .map((c) => reverseConditionMap[c] || c.toUpperCase())
          .filter(Boolean);

        if (mappedConditions.length > 0) {
          where.condition = { in: mappedConditions };
        }
      }
    }

    // Provider Type filter (student / external)
    if (providerType && providerType !== 'All') {
      const dbProviderType =
        providerType.toLowerCase() === 'external' ? 'EXTERNAL_PROVIDER' : 'STUDENT_PROVIDER';
      where.provider = {
        ...(where.provider || {}),
        providerType: dbProviderType,
      };
    }

    // Min rating filter
    if (minRating && Number(minRating) > 0) {
      where.provider = {
        ...(where.provider || {}),
        overallRating: { gte: Number(minRating) },
      };
    }

    // Sorting
    let orderBy = [{ id: 'desc' }];
    if (sort === 'Price: Low to High') {
      orderBy = [{ price: 'asc' }, { id: 'desc' }];
    } else if (sort === 'Price: High to Low') {
      orderBy = [{ price: 'desc' }, { id: 'desc' }];
    } else if (sort === 'Highest Rated') {
      orderBy = [{ provider: { overallRating: 'desc' } }, { id: 'desc' }];
    }

    // Cursor pagination (for newest sorting)
    if (cursor && (sort === 'Newest' || !sort)) {
      where.id = { lt: cursor };
    }

    const listings = await prisma.marketplaceProduct.findMany({
      where,
      select: marketplaceProductSelect,
      orderBy,
      take: limit + 1,
    });

    const hasMore = listings.length > limit;
    const page = hasMore ? listings.slice(0, limit) : listings;

    return {
      products: page.map(toDetailedProduct),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /**
   * Get single marketplace product by ID
   * Increments views count asynchronously
   * @param {number} id
   * @returns {Object|null}
   */
  async getProductById(id) {
    const product = await prisma.marketplaceProduct.findUnique({
      where: { id },
      select: marketplaceProductSelect,
    });

    if (!product) return null;

    // Increment views count non-blocking
    prisma.marketplaceProduct
      .update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch((err) => console.error('Error incrementing view count:', err.message));

    return toDetailedProduct(product);
  }

  /**
   * Create a new marketplace product
   * @param {number} userId
   * @param {Object} data
   * @returns {Object}
   */
  async createProduct(userId, data) {
    const {
      title,
      description,
      price,
      condition,
      location,
      detailedAddress,
      category,
      photos = [],
      details = [],
      locationDetails,
      allowNegotiation = true,
      providerType = 'student',
    } = data;

    if (!title || !price || !category || !condition || !location) {
      throw new Error('Title, price, category, condition, and location are required.');
    }

    // Ensure user has a provider profile
    let provider = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!provider) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { userProfile: true },
      });

      const actualType =
        providerType === 'external' ? 'EXTERNAL_PROVIDER' : 'STUDENT_PROVIDER';
      const displayName =
        user?.userProfile?.fullName || user?.email?.split('@')[0] || 'UniMart Provider';

      provider = await prisma.providerProfile.create({
        data: {
          userId,
          providerType: actualType,
          displayName,
          verificationStatus: 'VERIFIED',
          overallRating: 5.0,
          totalReviews: 1,
        },
      });
    }

    // Find or create category
    let categoryRecord = await prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: category } },
          { slug: { equals: category.toLowerCase().replace(/\s+/g, '-') } },
        ],
      },
    });

    if (!categoryRecord) {
      categoryRecord = await prisma.category.create({
        data: {
          name: category,
          slug: category.toLowerCase().replace(/\s+/g, '-'),
          type: 'MARKETPLACE',
          description: `${category} items`,
        },
      });
    }

    const mappedCondition =
      reverseConditionMap[condition] || reverseConditionMap[condition.toLowerCase()] || 'GOOD';

    const numericPrice = Number(price);

    const fullLocationDetails = locationDetails || {
      address: detailedAddress
        ? `${detailedAddress.trim()}, ${location.trim()}`
        : `${location.trim()}, Campus Area`,
      mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
    };

    const imageArray = Array.isArray(photos) && photos.length > 0
      ? photos
      : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80'];

    const newProduct = await prisma.marketplaceProduct.create({
      data: {
        providerId: provider.id,
        categoryId: categoryRecord.id,
        title: title.trim(),
        description: description?.trim() || '',
        price: numericPrice,
        condition: mappedCondition,
        location: location.trim(),
        status: 'AVAILABLE',
        details: Array.isArray(details) ? details : [],
        locationDetails: fullLocationDetails,
        allowNegotiation: Boolean(allowNegotiation),
        reviews: [],
        images: {
          create: imageArray.map((url, idx) => ({
            imageUrl: url,
            isPrimary: idx === 0,
          })),
        },
      },
      select: marketplaceProductSelect,
    });

    return toDetailedProduct(newProduct);
  }

  /**
   * Get products posted by the currently authenticated user
   * @param {number} userId
   * @returns {Array}
   */
  async getMyListings(userId) {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!provider) {
      return [];
    }

    const products = await prisma.marketplaceProduct.findMany({
      where: {
        providerId: provider.id,
      },
      select: marketplaceProductSelect,
      orderBy: { createdAt: 'desc' },
    });

    return products.map(toDetailedProduct);
  }

  /**
   * Update product status (e.g., mark as sold or available)
   * @param {number} id
   * @param {number} userId
   * @param {string} status - 'active' | 'sold' | 'AVAILABLE' | 'SOLD'
   */
  async updateProductStatus(id, userId, status) {
    const product = await prisma.marketplaceProduct.findUnique({
      where: { id },
      include: { provider: true },
    });

    if (!product) {
      throw new Error('Product not found.');
    }

    if (product.provider.userId !== userId) {
      throw new Error('You do not have permission to update this product.');
    }

    const normalizedStatus =
      status?.toUpperCase() === 'SOLD' ? 'SOLD' : 'AVAILABLE';

    const updated = await prisma.marketplaceProduct.update({
      where: { id },
      data: { status: normalizedStatus },
      select: marketplaceProductSelect,
    });

    return toDetailedProduct(updated);
  }

  /**
   * Delete a product listing
   * @param {number} id
   * @param {number} userId
   */
  async deleteProduct(id, userId) {
    const product = await prisma.marketplaceProduct.findUnique({
      where: { id },
      include: { provider: true },
    });

    if (!product) {
      throw new Error('Product not found.');
    }

    if (product.provider.userId !== userId) {
      throw new Error('You do not have permission to delete this product.');
    }

    await prisma.marketplaceProduct.delete({
      where: { id },
    });

    return { success: true, message: 'Product deleted successfully.' };
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
 * Format a database product into the shape expected by frontend screens
 */
function toDetailedProduct(product) {
  const numericPrice = Number(product.price);
  const images = (product.images || []).map((img) => img.imageUrl);
  const isExternal = product.provider?.providerType === 'EXTERNAL_PROVIDER';
  const userProfile = product.provider?.user?.userProfile;

  const reviewsList = Array.isArray(product.reviews) ? product.reviews : [];
  const reviewsCountNumber = reviewsList.length > 0 ? reviewsList.length : product.provider?.totalReviews || 0;

  const rawStatus = (product.status || 'AVAILABLE').toLowerCase();
  const statusFormatted = rawStatus === 'available' ? 'active' : rawStatus;

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
    status: statusFormatted,
    category: product.category?.name || 'General',
    categorySlug: product.category?.slug || '',
    images: images.length > 0 ? images : ['https://via.placeholder.com/300?text=No+Image'],
    providerType: isExternal ? 'external' : 'student',
    rating: product.provider?.overallRating ? Number(product.provider.overallRating).toFixed(1) : '4.8',
    reviewsCount: reviewsCountNumber.toString(),
    viewsCount: product.viewsCount || 0,
    inquiriesCount: product.inquiriesCount || 0,
    allowNegotiation: product.allowNegotiation !== false,
    details: Array.isArray(product.details) ? product.details : [],
    locationDetails: product.locationDetails || {
      address: product.location,
      mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80',
    },
    reviews: reviewsList,
    provider: {
      id: product.provider?.id,
      name: product.provider?.displayName || userProfile?.fullName || 'Campus Seller',
      type: isExternal ? 'External Provider' : 'Student Provider',
      isVerified: product.provider?.verificationStatus === 'VERIFIED',
      rating: product.provider?.overallRating ? Number(product.provider.overallRating).toFixed(1) : '4.8',
      reviewsCount: product.provider?.totalReviews || reviewsCountNumber,
      avatar:
        userProfile?.profilePictureUrl ||
        (isExternal
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80'),
      university: userProfile?.university || 'University of Sri Lanka',
      contactNumber: product.provider?.user?.contactNumber || null,
      memberSince: product.provider?.createdAt
        ? new Date(product.provider.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Jan 2025',
    },
    createdAt: product.createdAt,
  };
}

export default new MarketplaceService();
