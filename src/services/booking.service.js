import crypto from 'crypto';
import prisma from '../config/prisma.js';

// Custom error classes for clean HTTP status mapping in controllers
export class BookingValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BookingValidationError';
    this.statusCode = 400;
  }
}

export class ConcurrencyConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ConcurrencyConflictError';
    this.statusCode = 409;
    this.details = details;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied: You do not have permission for this action.') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Calculates rental price based on listing rates and rental duration
 */
export function calculateRentalPrice({ rentalPrice, rentalPeriod, startDate, endDate }) {
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) {
    throw new BookingValidationError('End date must be strictly after start date.');
  }

  const hours = diffMs / (1000 * 60 * 60);
  const basePrice = Number(rentalPrice);

  let units = 1;
  switch (rentalPeriod) {
    case 'HOURLY':
      units = Math.max(1, Math.ceil(hours));
      break;
    case 'DAILY':
      units = Math.max(1, Math.ceil(hours / 24));
      break;
    case 'WEEKLY':
      units = Math.max(1, Math.ceil(hours / (24 * 7)));
      break;
    case 'MONTHLY':
      units = Math.max(1, Math.ceil(hours / (24 * 30)));
      break;
    default:
      units = Math.max(1, Math.ceil(hours / 24));
      break;
  }

  const totalPrice = Number((units * basePrice).toFixed(2));
  return { units, rentalPeriod, unitPrice: basePrice, totalPrice };
}

/**
 * Generates a human-readable unique booking number
 * Example: UB-2026-9F83A
 */
export function generateBookingNumber() {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `UB-${year}-${randomPart}`;
}

// Common rich selection query for booking objects
const bookingInclude = {
  rentalListing: {
    select: {
      id: true,
      title: true,
      rentalPrice: true,
      rentalPeriod: true,
      itemType: true,
      condition: true,
      status: true,
      images: {
        select: { imageUrl: true, isPrimary: true },
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
          latitude: true,
          longitude: true,
        },
      },
      provider: {
        select: {
          id: true,
          userId: true,
          displayName: true,
          rating: true,
          user: {
            select: {
              contactNumber: true,
              email: true,
              userProfile: {
                select: {
                  fullName: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
        },
      },
    },
  },
  rentalAsset: {
    select: {
      id: true,
      assetIdentifier: true,
      notes: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      contactNumber: true,
      userProfile: {
        select: {
          fullName: true,
          profilePictureUrl: true,
          university: true,
          faculty: true,
        },
      },
    },
  },
};

/**
 * Converts Decimal database fields to numbers and shapes the payload for the app
 */
function formatBooking(booking) {
  if (!booking) return null;
  const { totalPrice, rentalListing, user, ...rest } = booking;

  let formattedListing = null;
  if (rentalListing) {
    const { rentalPrice, images, vehicleDetail, equipmentDetail, provider, ...listingFields } = rentalListing;
    formattedListing = {
      ...listingFields,
      rentalPrice: Number(rentalPrice),
      primaryImageUrl: images?.[0]?.imageUrl || null,
      images: images?.map((img) => img.imageUrl) || [],
      vehicleDetail: vehicleDetail
        ? {
            ...vehicleDetail,
            latitude: vehicleDetail.latitude ? Number(vehicleDetail.latitude) : null,
            longitude: vehicleDetail.longitude ? Number(vehicleDetail.longitude) : null,
          }
        : null,
      equipmentDetail: equipmentDetail
        ? {
            ...equipmentDetail,
            latitude: equipmentDetail.latitude ? Number(equipmentDetail.latitude) : null,
            longitude: equipmentDetail.longitude ? Number(equipmentDetail.longitude) : null,
          }
        : null,
      pickupLocationName:
        vehicleDetail?.pickupLocationName ||
        equipmentDetail?.pickupLocationName ||
        'Campus Designated Point',
      provider: provider
        ? {
            id: provider.id,
            userId: provider.userId,
            displayName: provider.displayName,
            rating: Number(provider.rating || 0),
            contactNumber: provider.user?.contactNumber || null,
            email: provider.user?.email || null,
            fullName: provider.user?.userProfile?.fullName || provider.displayName,
            avatar: provider.user?.userProfile?.profilePictureUrl || null,
          }
        : null,
    };
  }

  let formattedRenter = null;
  if (user) {
    formattedRenter = {
      id: user.id,
      email: user.email,
      contactNumber: user.contactNumber,
      fullName: user.userProfile?.fullName || 'Student Renter',
      avatar: user.userProfile?.profilePictureUrl || null,
      university: user.userProfile?.university || null,
      faculty: user.userProfile?.faculty || null,
    };
  }

  return {
    ...rest,
    totalPrice: Number(totalPrice),
    rentalListing: formattedListing,
    renter: formattedRenter,
  };
}

class BookingService {
  /**
   * Checks whether a listing is available for a given date range
   * without creating a booking (e.g. for calendar/date picker UI).
   */
  async checkAvailability({ rentalListingId, startDate, endDate }) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BookingValidationError('Invalid start or end date format.');
    }

    if (start >= end) {
      throw new BookingValidationError('Start date must be before end date.');
    }

    const listing = await prisma.rentalListing.findUnique({
      where: { id: rentalListingId },
      include: {
        assets: {
          where: { status: 'AVAILABLE' },
        },
      },
    });

    if (!listing || listing.status !== 'ACTIVE') {
      throw new NotFoundError('Rental listing not found or is currently inactive.');
    }

    // Mathematical overlap condition: (existingStart < requestedEnd) AND (existingEnd > requestedStart)
    const activeBookings = await prisma.rentalBooking.findMany({
      where: {
        rentalListingId,
        status: { in: ['ACCEPTED', 'PENDING'] },
        AND: [
          { startDate: { lt: end } },
          { endDate: { gt: start } },
        ],
      },
      select: {
        id: true,
        rentalAssetId: true,
        startDate: true,
        endDate: true,
      },
    });

    const totalAssets = listing.assets.length;

    // Case 1: Listing with multiple physical assets
    if (totalAssets > 0) {
      const bookedAssetIds = new Set(
        activeBookings.map((b) => b.rentalAssetId).filter(Boolean)
      );
      const availableAssets = listing.assets.filter((a) => !bookedAssetIds.has(a.id));

      return {
        available: availableAssets.length > 0,
        totalAssets,
        availableCount: availableAssets.length,
        conflictingBookingCount: activeBookings.length,
        priceCalculation: calculateRentalPrice({
          rentalPrice: listing.rentalPrice,
          rentalPeriod: listing.rentalPeriod,
          startDate: start,
          endDate: end,
        }),
      };
    }

    // Case 2: Listing without explicit assets (the listing itself is the single unit)
    const isAvailable = activeBookings.length === 0;

    return {
      available: isAvailable,
      totalAssets: 1,
      availableCount: isAvailable ? 1 : 0,
      conflictingBookingCount: activeBookings.length,
      priceCalculation: calculateRentalPrice({
        rentalPrice: listing.rentalPrice,
        rentalPeriod: listing.rentalPeriod,
        startDate: start,
        endDate: end,
      }),
    };
  }

  /**
   * Core Concurrency-Safe Booking Creation
   * Executes inside an atomic Prisma transaction to prevent double bookings.
   */
  async createBookingWithConcurrencyLock({ userId, rentalListingId, startDate, endDate }) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BookingValidationError('Invalid start or end date format.');
    }

    const now = new Date();
    // Allow small 5-minute clock drift
    if (start.getTime() < now.getTime() - 5 * 60 * 1000) {
      throw new BookingValidationError('Start date cannot be in the past.');
    }

    if (start >= end) {
      throw new BookingValidationError('End date must be after start date.');
    }

    // Run atomically inside a transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch listing and lockable assets
      const listing = await tx.rentalListing.findUnique({
        where: { id: rentalListingId },
        include: {
          assets: {
            where: { status: 'AVAILABLE' },
          },
          provider: true,
        },
      });

      if (!listing || listing.status !== 'ACTIVE') {
        throw new NotFoundError('Rental listing not found or is currently inactive.');
      }

      // Prevent provider from booking their own listing
      if (listing.provider && listing.provider.userId === userId) {
        throw new BookingValidationError('You cannot book your own rental listing.');
      }

      // 2. CONCURRENCY BLOCKER: Check for overlapping bookings
      const overlappingBookings = await tx.rentalBooking.findMany({
        where: {
          rentalListingId,
          status: { in: ['ACCEPTED', 'PENDING'] },
          AND: [
            { startDate: { lt: end } },
            { endDate: { gt: start } },
          ],
        },
        select: {
          id: true,
          bookingNumber: true,
          rentalAssetId: true,
          startDate: true,
          endDate: true,
        },
      });

      let assignedAssetId = null;
      const totalAssets = listing.assets.length;

      if (totalAssets > 0) {
        // Multi-asset listing: find an unreserved asset
        const bookedAssetIds = new Set(
          overlappingBookings.map((b) => b.rentalAssetId).filter(Boolean)
        );
        const freeAssets = listing.assets.filter((a) => !bookedAssetIds.has(a.id));

        if (freeAssets.length === 0) {
          throw new ConcurrencyConflictError(
            'Concurrency Conflict: All units for this rental are already booked for the selected time window.',
            {
              requestedWindow: { start, end },
              overlappingCount: overlappingBookings.length,
            }
          );
        }

        // Assign the first free asset
        assignedAssetId = freeAssets[0].id;
      } else {
        // Single unit listing
        if (overlappingBookings.length > 0) {
          throw new ConcurrencyConflictError(
            'Concurrency Conflict: This rental is already booked for the selected time window. Please choose another date or time.',
            {
              requestedWindow: { start, end },
              overlappingCount: overlappingBookings.length,
            }
          );
        }
      }

      // 3. Calculate final total price
      const priceInfo = calculateRentalPrice({
        rentalPrice: listing.rentalPrice,
        rentalPeriod: listing.rentalPeriod,
        startDate: start,
        endDate: end,
      });

      // 4. Create the booking atomically
      const bookingNumber = generateBookingNumber();

      const booking = await tx.rentalBooking.create({
        data: {
          bookingNumber,
          userId,
          rentalListingId,
          rentalAssetId: assignedAssetId,
          startDate: start,
          endDate: end,
          totalPrice: priceInfo.totalPrice,
          status: 'PENDING',
        },
        include: bookingInclude,
      });

      return {
        booking: formatBooking(booking),
        priceInfo,
      };
    });
  }

  /**
   * Get all bookings for the logged-in student (buyer perspective)
   */
  async getMyBookings({ userId, status, limit = 20, cursor }) {
    const where = { userId };

    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'].includes(normalizedStatus)) {
        where.status = normalizedStatus;
      } else if (normalizedStatus === 'ACTIVE') {
        where.status = 'ACCEPTED';
      }
    }

    const takeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const bookings = await prisma.rentalBooking.findMany({
      where,
      include: bookingInclude,
      orderBy: { id: 'desc' },
      take: takeLimit + 1,
      ...(cursor && {
        cursor: { id: Number(cursor) },
        skip: 1,
      }),
    });

    const hasMore = bookings.length > takeLimit;
    const page = hasMore ? bookings.slice(0, takeLimit) : bookings;

    return {
      bookings: page.map(formatBooking),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /**
   * Get all bookings for items owned by a provider (provider perspective)
   */
  async getProviderBookings({ providerUserId, status, limit = 20, cursor }) {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundError('Provider profile not found for this user.');
    }

    const where = {
      rentalListing: {
        providerId: provider.id,
      },
    };

    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'].includes(normalizedStatus)) {
        where.status = normalizedStatus;
      } else if (normalizedStatus === 'ACTIVE') {
        where.status = 'ACCEPTED';
      }
    }

    const takeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const bookings = await prisma.rentalBooking.findMany({
      where,
      include: bookingInclude,
      orderBy: { id: 'desc' },
      take: takeLimit + 1,
      ...(cursor && {
        cursor: { id: Number(cursor) },
        skip: 1,
      }),
    });

    const hasMore = bookings.length > takeLimit;
    const page = hasMore ? bookings.slice(0, takeLimit) : bookings;

    return {
      bookings: page.map(formatBooking),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /**
   * Get details of a single booking by ID
   */
  async getBookingById({ bookingId, userId }) {
    const booking = await prisma.rentalBooking.findUnique({
      where: { id: Number(bookingId) },
      include: bookingInclude,
    });

    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }

    const isRenter = booking.userId === userId;
    const isProvider = booking.rentalListing?.provider?.userId === userId;

    if (!isRenter && !isProvider) {
      throw new ForbiddenError('You are not authorized to view this booking.');
    }

    return formatBooking(booking);
  }

  /**
   * Cancel an active or pending booking
   * Releases the locked time window immediately so others can book.
   */
  async cancelBooking({ bookingId, userId, cancellationReason }) {
    const booking = await prisma.rentalBooking.findUnique({
      where: { id: Number(bookingId) },
      include: {
        rentalListing: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }

    const isRenter = booking.userId === userId;
    const isProvider = booking.rentalListing?.provider?.userId === userId;

    if (!isRenter && !isProvider) {
      throw new ForbiddenError('You do not have permission to cancel this booking.');
    }

    if (['CANCELLED', 'REJECTED'].includes(booking.status)) {
      throw new BookingValidationError('This booking is already cancelled or rejected.');
    }

    if (booking.status === 'COMPLETED') {
      throw new BookingValidationError('Cannot cancel a booking that has already been completed.');
    }

    const updatedBooking = await prisma.rentalBooking.update({
      where: { id: Number(bookingId) },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancellationReason || 'Cancelled by user.',
      },
      include: bookingInclude,
    });

    return formatBooking(updatedBooking);
  }

  /**
   * Provider action: Accept or Reject a requested booking
   */
  async updateBookingStatus({ bookingId, providerUserId, status }) {
    const normalizedStatus = status?.toUpperCase();
    if (!['ACCEPTED', 'REJECTED', 'COMPLETED'].includes(normalizedStatus)) {
      throw new BookingValidationError('Invalid status. Allowed values: ACCEPTED, REJECTED, COMPLETED.');
    }

    const booking = await prisma.rentalBooking.findUnique({
      where: { id: Number(bookingId) },
      include: {
        rentalListing: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }

    const isProvider = booking.rentalListing?.provider?.userId === providerUserId;
    if (!isProvider) {
      throw new ForbiddenError('Only the provider of this rental listing can update this booking status.');
    }

    if (booking.status === 'CANCELLED') {
      throw new BookingValidationError('Cannot update a booking that was already cancelled by the student.');
    }

    const updatedBooking = await prisma.rentalBooking.update({
      where: { id: Number(bookingId) },
      data: {
        status: normalizedStatus,
      },
      include: bookingInclude,
    });

    return formatBooking(updatedBooking);
  }
}

export default new BookingService();
