import { Request, Response } from 'express';
import { EvaluationService } from '../reservations/evaluation.service';
import { z } from 'zod';
import { SettingsService } from '../settings/settings.service';
import { prisma } from '../../lib/db';
import { ReservationStatus } from '@prisma/client';

const evaluateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  partySize: z.number().int().min(1).max(50),
  source: z.string().optional(),
});

const capacitySlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export class CapacityController {
  private evaluationService: EvaluationService;
  private settingsService: SettingsService;

  constructor() {
    this.evaluationService = new EvaluationService();
    this.settingsService = new SettingsService();
  }

  // Parse YYYY-MM-DD into a local Date at noon to avoid UTC shifts
  private parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  /**
   * Evaluate a reservation request - POST /api/capacity/evaluate
   */
  evaluate = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = evaluateSchema.parse(req.body);
      const result = await this.evaluationService.evaluateReservation(validatedData);

      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error evaluating reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get available time slots - GET /api/capacity/slots?date=YYYY-MM-DD
   */
  getSlots = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedQuery = capacitySlotsQuerySchema.parse(req.query);
      const { date } = validatedQuery;

      const settings = await this.settingsService.getSettings();

      // Get operating hours for this date
      const dateObj = this.parseLocalDate(date);
      const dayOfWeek = dateObj.getDay();

      // Check special dates first
      let hours = settings.specialDates.find((sd) => sd.date === date);
      if (hours && hours.isClosed) {
        res.json({ slots: [] });
        return;
      }

      // Get regular operating hours
      const regularHours = settings.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
      if (!regularHours || regularHours.isClosed) {
        res.json({ slots: [] });
        return;
      }

      const openTime = hours?.customOpenTime || regularHours.openTime;
      const closeTime = hours?.customCloseTime || regularHours.closeTime;

      // Generate 15-minute slots
      const slots = [];
      let currentTime = openTime;

      while (currentTime < closeTime) {
        const capacity = await this.calculateSlotCapacity(date, currentTime, settings);

        slots.push({
          time: currentTime,
          utilization: capacity.utilization,
          reservationCount: capacity.reservationCount,
          maxReservations: settings.maxReservationsPerSlot,
          isAvailable: capacity.reservationCount < settings.maxReservationsPerSlot,
          status: this.getSlotStatus(
            capacity.utilization,
            capacity.reservationCount,
            settings
          ),
        });

        currentTime = this.addMinutes(currentTime, 15);
      }

      res.json({ slots });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error fetching capacity slots:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Calculate capacity for a specific slot
   */
  private async calculateSlotCapacity(date: string, time: string, settings: any) {
    const turnoverMinutes = settings.turnoverMinutes;

    const reservations = await prisma.reservation.findMany({
      where: {
        date: this.parseLocalDate(date),
        status: ReservationStatus.CONFIRMED,
      },
    });

    const [requestHours, requestMinutes] = time.split(':').map(Number);
    const requestTimeInMinutes = requestHours * 60 + requestMinutes;

    const relevantReservations = reservations.filter((r) => {
      const [resHours, resMinutes] = r.time.split(':').map(Number);
      const resTimeInMinutes = resHours * 60 + resMinutes;
      const diff = Math.abs(requestTimeInMinutes - resTimeInMinutes);
      return diff <= turnoverMinutes;
    });

    const reservationCount = relevantReservations.length;
    const totalGuests = relevantReservations.reduce((sum, r) => sum + r.partySize, 0);
    const totalCapacity = settings.diningRoomSeats + settings.barSeats + settings.outdoorSeats;
    const utilization = totalGuests / totalCapacity;

    return { utilization, reservationCount, totalGuests };
  }

  /**
   * Determine slot status based on utilization
   */
  private getSlotStatus(utilization: number, count: number, settings: any): string {
    if (count >= settings.maxReservationsPerSlot) return 'full';
    if (utilization >= 0.85) return 'limited';
    return 'available';
  }

  /**
   * Add minutes to time string
   */
  private addMinutes(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }
}
