import { Request, Response } from 'express';
import { ReservationService } from '../reservations/reservation.service';
import { sendReservationUpdated, sendReservationCancelled } from '../../lib/email';
import { z } from 'zod';
import { ReservationStatus } from '@prisma/client';

// Schema for guest updates (limited fields)
const guestUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Time must be in HH:mm or HH:mm:ss format').optional(),
  partySize: z.number().int().min(1).max(20).optional(),
  notes: z.string().optional(),
});

export class PublicController {
  private reservationService: ReservationService;

  constructor() {
    this.reservationService = new ReservationService();
  }

  /**
   * Get Reservation by Token - GET /api/public/reservations/:token
   */
  getByToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      
      const reservation = await this.reservationService.getByToken(token);

      if (!reservation) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      res.json({ reservation });
    } catch (error) {
      console.error('Error fetching reservation by token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Update Reservation by Token - PATCH /api/public/reservations/:token
   * Guest can update date, time, partySize, notes
   * Sets status back to PENDING
   */
  updateByToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      const validatedData = guestUpdateSchema.parse(req.body);

      // Convert date string to Date if provided
      const updates: any = { ...validatedData };
      if (updates.date) {
        updates.date = new Date(updates.date);
      }

      const reservation = await this.reservationService.updateByToken(
        token,
        updates,
        true // setToPending flag
      );

      // Send email notification
      if (reservation.email) {
        await sendReservationUpdated(
          reservation.email,
          reservation.guestName,
          reservation.date.toISOString().split('T')[0],
          reservation.time,
          reservation.partySize,
          reservation.cancelToken
        );
      }

      res.json({ reservation });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      if (error.message === 'Reservation not found') {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }
      console.error('Error updating reservation by token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Cancel Reservation by Token - POST /api/public/reservations/:token/cancel
   */
  cancelByToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      const reservation = await this.reservationService.cancelByToken(token);

      // Send cancellation email
      if (reservation.email) {
        await sendReservationCancelled(
          reservation.email,
          reservation.guestName,
          reservation.date.toISOString().split('T')[0],
          reservation.time
        );
      }

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
      console.error('Error cancelling reservation by token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
