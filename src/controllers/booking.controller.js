import bookingService, {
  BookingValidationError,
  ConcurrencyConflictError,
  ForbiddenError,
  NotFoundError,
} from '../services/booking.service.js';

/**
 * Maps custom domain errors to appropriate HTTP responses
 */
function handleBookingError(res, error, defaultMessage = 'Internal server error while processing booking.') {
  if (error instanceof ConcurrencyConflictError) {
    return res.status(409).json({
      status: 'error',
      code: 'CONCURRENCY_CONFLICT',
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof BookingValidationError) {
    return res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      status: 'error',
      message: error.message,
    });
  }

  if (error instanceof ForbiddenError) {
    return res.status(403).json({
      status: 'error',
      message: error.message,
    });
  }

  console.error('Unhandled booking error:', error);
  return res.status(500).json({
    status: 'error',
    message: defaultMessage,
  });
}

class BookingController {
  /**
   * Create a new rental booking with concurrency lock
   * POST /api/bookings
   */
  async createBooking(req, res) {
    try {
      const { rentalListingId, startDate, endDate } = req.body;

      if (!rentalListingId || isNaN(Number(rentalListingId))) {
        return res.status(400).json({
          status: 'error',
          message: 'rentalListingId is required and must be a valid number.',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Both startDate and endDate are required in ISO format.',
        });
      }

      const result = await bookingService.createBookingWithConcurrencyLock({
        userId: req.user.id,
        rentalListingId: Number(rentalListingId),
        startDate,
        endDate,
      });

      return res.status(201).json({
        status: 'success',
        message: 'Booking placed successfully! Reserved time slot has been secured.',
        data: result,
      });
    } catch (error) {
      return handleBookingError(res, error, 'Failed to create booking.');
    }
  }

  /**
   * Pre-check availability for a rental listing over a date range
   * GET /api/bookings/check-availability?rentalListingId=1&startDate=...&endDate=...
   */
  async checkAvailability(req, res) {
    try {
      const { rentalListingId, startDate, endDate } = req.query;

      if (!rentalListingId || isNaN(Number(rentalListingId))) {
        return res.status(400).json({
          status: 'error',
          message: 'rentalListingId query parameter is required.',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          message: 'Both startDate and endDate query parameters are required.',
        });
      }

      const result = await bookingService.checkAvailability({
        rentalListingId: Number(rentalListingId),
        startDate,
        endDate,
      });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return handleBookingError(res, error, 'Failed to check availability.');
    }
  }

  /**
   * Get all bookings for the logged-in student
   * GET /api/bookings/my-bookings?status=ACTIVE&limit=20&cursor=123
   */
  async getMyBookings(req, res) {
    try {
      const { status, limit, cursor } = req.query;

      const result = await bookingService.getMyBookings({
        userId: req.user.id,
        status: status ? String(status).trim() : undefined,
        limit: limit ? Number(limit) : undefined,
        cursor: cursor ? Number(cursor) : undefined,
      });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return handleBookingError(res, error, 'Failed to load your bookings.');
    }
  }

  /**
   * Get all bookings for items owned by the provider
   * GET /api/bookings/provider?status=PENDING&limit=20&cursor=123
   */
  async getProviderBookings(req, res) {
    try {
      const { status, limit, cursor } = req.query;

      const result = await bookingService.getProviderBookings({
        providerUserId: req.user.id,
        status: status ? String(status).trim() : undefined,
        limit: limit ? Number(limit) : undefined,
        cursor: cursor ? Number(cursor) : undefined,
      });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return handleBookingError(res, error, 'Failed to load provider bookings.');
    }
  }

  /**
   * Get details of a single booking
   * GET /api/bookings/:id
   */
  async getBookingById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid booking ID is required.',
        });
      }

      const result = await bookingService.getBookingById({
        bookingId: Number(id),
        userId: req.user.id,
      });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return handleBookingError(res, error, 'Failed to retrieve booking details.');
    }
  }

  /**
   * Cancel an active or pending booking
   * PATCH /api/bookings/:id/cancel
   */
  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid booking ID is required.',
        });
      }

      const result = await bookingService.cancelBooking({
        bookingId: Number(id),
        userId: req.user.id,
        cancellationReason: cancellationReason ? String(cancellationReason).trim() : undefined,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Booking cancelled successfully. Reserved time slot has been released.',
        data: result,
      });
    } catch (error) {
      return handleBookingError(res, error, 'Failed to cancel booking.');
    }
  }

  /**
   * Provider updates booking status (ACCEPTED, REJECTED, COMPLETED)
   * PATCH /api/bookings/:id/status
   */
  async updateBookingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid booking ID is required.',
        });
      }

      if (!status) {
        return res.status(400).json({
          status: 'error',
          message: 'Status is required (ACCEPTED, REJECTED, or COMPLETED).',
        });
      }

      const result = await bookingService.updateBookingStatus({
        bookingId: Number(id),
        providerUserId: req.user.id,
        status: String(status).trim(),
      });

      return res.status(200).json({
        status: 'success',
        message: `Booking status updated to ${status}.`,
        data: result,
      });
    } catch (error) {
      return handleBookingError(res, error, 'Failed to update booking status.');
    }
  }
}

export default new BookingController();
