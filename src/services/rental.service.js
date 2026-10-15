import prisma from '../config/prisma.js';

// Only the fields the rental feed card and map need (UNI-307 database optimization).
// Large fields such as description and specifications are intentionally left out.
const rentalFeedSelect = {
  id: true,
  title: true,
  rentalPrice: true,
  rentalPeriod: true,
  itemType: true,
  condition: true,
  status: true,
  images: {
    select: { imageUrl: true },
    // Primary image first; falls back to the oldest image if none is marked primary
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
    take: 1,
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
};

class RentalService {
  /**
   * Get active rental listings for the feed, newest first
   * @param {Object} options - { limit, cursor }
   * @returns {Object} { rentals, nextCursor }
   */
  async getRentalFeed({ limit, cursor }) {
    // Fetch one extra row to know whether another page exists
    const listings = await prisma.rentalListing.findMany({
      where: { status: 'ACTIVE' },
      select: rentalFeedSelect,
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = listings.length > limit;
    const page = hasMore ? listings.slice(0, limit) : listings;

    return {
      rentals: page.map(toFeedItem),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}

// Flatten the Prisma result and convert Decimal values to numbers for the app
function toFeedItem(listing) {
  const { images, vehicleDetail, rentalPrice, ...fields } = listing;

  return {
    ...fields,
    rentalPrice: Number(rentalPrice),
    primaryImageUrl: images[0]?.imageUrl ?? null,
    vehicle: vehicleDetail
      ? {
          ...vehicleDetail,
          latitude: Number(vehicleDetail.latitude),
          longitude: Number(vehicleDetail.longitude),
        }
      : null,
  };
}

export default new RentalService();
