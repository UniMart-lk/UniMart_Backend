import { Router } from 'express';
import bookingController from '../controllers/booking.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Pre-booking availability query (e.g. for calendar and date pickers)
router.get('/check-availability', (req, res) => bookingController.checkAvailability(req, res));

// Authenticated booking endpoints
router.post('/', authenticate, (req, res) => bookingController.createBooking(req, res));
router.get('/my-bookings', authenticate, (req, res) => bookingController.getMyBookings(req, res));
router.get('/provider', authenticate, (req, res) => bookingController.getProviderBookings(req, res));
router.get('/:id', authenticate, (req, res) => bookingController.getBookingById(req, res));
router.patch('/:id/cancel', authenticate, (req, res) => bookingController.cancelBooking(req, res));
router.patch('/:id/status', authenticate, (req, res) => bookingController.updateBookingStatus(req, res));

export default router;
