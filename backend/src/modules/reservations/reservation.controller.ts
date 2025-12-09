import { Request, Response } from 'express';
import { ReservationService } from './reservation.service';
import {
  createReservationSchema,
  updateReservationSchema,
  getReservationsQuerySchema,
} from './reservation.schema';
import { ReservationStatus } from '@prisma/client';

export class ReservationController {
  private reservationService: ReservationService;

  constructor() {
    this.reservationService = new ReservationService();
  }

  /**
   * POST /api/reservations
   * Create a new reservation
   */
  createReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = createReservationSchema.parse(req.body);

      const result = await this.reservationService.createReservation({
        ...validatedData,
        date: new Date(validatedData.date),
      });

      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error creating reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /api/reservations
   * Get reservations with optional filters
   */
  getReservations = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedQuery = getReservationsQuerySchema.parse(req.query);

      const reservations = await this.reservationService.getReservations(
        validatedQuery.date ? new Date(validatedQuery.date) : undefined,
        validatedQuery.status as ReservationStatus | undefined
      );

      res.json({ reservations });
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
   * GET /api/reservations/:id
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

      res.json({ reservation });
    } catch (error) {
      console.error('Error fetching reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * PATCH /api/reservations/:id
   * Update a reservation
   */
  updateReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = updateReservationSchema.parse(req.body);

      const reservation = await this.reservationService.updateReservation(id, validatedData);

      res.json({ reservation });
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
   * POST /api/reservations/:id/cancel
   * Cancel a reservation (internal use)
   */
  cancelReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const reservation = await this.reservationService.cancelReservation(id);

      res.json({ reservation, message: 'Reservation cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * GET /reservations/cancel/:cancelToken
   * Cancel a reservation via token (guest-facing)
   */
  cancelByToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cancelToken } = req.params;
      const reservation = await this.reservationService.cancelByToken(cancelToken);

      res.json({
        reservation,
        message: 'Your reservation has been cancelled successfully',
      });
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
