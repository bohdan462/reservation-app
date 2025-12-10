import { Request, Response } from 'express';
import { ReservationService } from './reservation.service';
import { serializeReservation, serializeReservations, parseDateUTC } from '../../lib/serialize';
import {
  createReservationSchema,
  updateReservationSchema,
  getReservationsQuerySchema,
} from './reservation.schema';
import { ReservationStatus } from '@prisma/client';
import { getReservationHistory } from '../../lib/reservationHistory';

// Use parseDateUTC from serialize to create a Date at UTC midnight for consistent DB writes/queries

export class ReservationController {
  private reservationService: ReservationService;

  constructor() {
    this.reservationService = new ReservationService();
  }

  /**
   * Create Reservation - POST /api/reservations
   * Create a new reservation
   */
  createReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      // Debug: log raw incoming body
      console.log('[RESERVATION] Incoming body:', req.body);

      const validatedData = createReservationSchema.parse(req.body);

      // Debug: log validated data
      console.log('[RESERVATION] Validated data:', validatedData);

      // Parse date correctly to avoid timezone issues
      // "2025-12-10" should be stored as Dec 10, not shifted to Dec 9
      const dateObj = parseDateUTC(validatedData.date);

      const result = await this.reservationService.createReservation({
        ...validatedData,
        date: dateObj,
      });

      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        // Debug: log zod issues clearly
        console.error('[RESERVATION] Zod validation failed:', JSON.stringify(error.errors, null, 2));
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      if (error.message.includes('Same-day bookings')) {
        res.status(400).json({ error: 'Validation error', message: error.message });
        return;
      }
      console.error('Error creating reservation:', error);
      // In development, include error details to aid debugging
      if (process.env.NODE_ENV !== 'production') {
        res.status(500).json({ error: 'Internal server error', message: error?.message, stack: error?.stack });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  /**
   * List Reservations - GET /api/reservations
   * Get reservations with optional filters: date, fromDate, toDate, status
   */
  getReservations = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedQuery = getReservationsQuerySchema.parse(req.query);

      const reservations = await this.reservationService.getReservations({
        date: validatedQuery.date ? parseDateUTC(validatedQuery.date) : undefined,
        fromDate: validatedQuery.fromDate ? parseDateUTC(validatedQuery.fromDate) : undefined,
        toDate: validatedQuery.toDate ? parseDateUTC(validatedQuery.toDate) : undefined,
        status: validatedQuery.status as ReservationStatus | undefined,
      });

      res.json({ reservations: serializeReservations(reservations) });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error fetching reservations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get Reservation by ID - GET /api/reservations/:id
   * Get a single reservation
   */
  getReservationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const reservation = await this.reservationService.getReservationById(id);

      if (!reservation) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      res.json({ reservation: serializeReservation(reservation) });
    } catch (error) {
      console.error('Error fetching reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Update Reservation - PATCH /api/reservations/:id
   * Update a reservation
   */
  updateReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = updateReservationSchema.parse(req.body);

      const reservation = await this.reservationService.updateReservation(id, validatedData);

      res.json({ reservation: serializeReservation(reservation) });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error updating reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Cancel Reservation (Internal) - POST /api/reservations/:id/cancel
   * Cancel a reservation (internal use)
   */
  cancelReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const reservation = await this.reservationService.cancelReservation(id);

      res.json({ reservation: serializeReservation(reservation), message: 'Reservation cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Delete Reservation - DELETE /api/reservations/:id
   * Permanently delete a reservation
   */
  deleteReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.reservationService.deleteReservation(id);

      res.json({ message: 'Reservation deleted successfully' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }
      console.error('Error deleting reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get Reservation History - GET /api/reservations/:id/history
   * Get timeline of all changes to a reservation (for internal use)
   */
  getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const history = await getReservationHistory(id);

      res.json({ history });
    } catch (error) {
      console.error('Error fetching reservation history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Cancel Reservation (Guest Token) - GET /reservations/cancel/:cancelToken
   * Cancel a reservation via token (guest-facing)
   */
  cancelByToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cancelToken } = req.params;
      const reservation = await this.reservationService.cancelByToken(cancelToken);

      res.json({ reservation: serializeReservation(reservation), message: 'Your reservation has been cancelled successfully' });
    } catch (error: any) {
      if (error.message === 'Reservation not found') {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }
      if (error.message === 'Reservation already cancelled') {
        res.status(400).json({ error: 'Reservation already cancelled' });
        return;
      }
      console.error('Error cancelling reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
