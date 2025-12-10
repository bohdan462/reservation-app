import { Reservation, ReservationStatus, ReservationSource } from '@prisma/client';
import { prisma } from '../../lib/db';
import { config } from '../../config';
import { WaitlistService } from '../waitlist/waitlist.service';
import {
  sendReservationConfirmation,
  sendReservationPending,
  sendWaitlistConfirmation,
} from '../../lib/email';
import { logReservationChange } from '../../lib/reservationHistory';
import { EvaluationService } from './evaluation.service';

export interface CreateReservationInput {
  guestName: string;
  email: string;
  phone: string;
  date: Date;
  time: string;
  partySize: number;
  notes?: string;
  source: ReservationSource;
}

export interface ReservationResult {
  status: 'confirmed' | 'pending' | 'waitlisted';
  reservation?: Reservation;
  waitlistEntry?: any;
  message: string;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class ReservationService {
  private waitlistService: WaitlistService;
  private evaluationService: EvaluationService;

  constructor() {
    this.waitlistService = new WaitlistService();
    this.evaluationService = new EvaluationService();
  }

  /**
   * Create a new reservation with automatic confirmation logic using smart evaluation
   */
  async createReservation(input: CreateReservationInput): Promise<ReservationResult> {
    // Normalize phone: input.phone may be digits-only from Zod transform
    const digits = input.phone.replace(/\D/g, '');
    const formattedPhone = digits.length === 11
      ? `+${digits[0]} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7,11)}`
      : input.phone;

    // Use new evaluation service for smart decision-making
    const evaluation = await this.evaluationService.evaluateReservation({
      date: formatDateLocal(input.date),
      time: input.time,
      partySize: input.partySize,
      source: input.source,
    });

    // Handle rejection
    if (evaluation.decision === 'REJECT') {
      throw new Error(evaluation.reason);
    }

    // Handle waitlist decision
    if (evaluation.decision === 'WAITLIST') {
      const waitlistEntry = await this.waitlistService.createEntry({
        guestName: input.guestName,
        email: input.email,
        phone: formattedPhone,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
      });

      // Send waitlist confirmation email
      if (input.email) {
        await sendWaitlistConfirmation(
          input.email,
          input.guestName,
          formatDateLocal(input.date),
          input.time,
          input.partySize
        );
      }

      // Return waitlist entry with date as YYYY-MM-DD to avoid client timezone shifts
      const serializedWaitlist = { ...waitlistEntry, date: formatDateLocal(waitlistEntry.date as Date) };
      return {
        status: 'waitlisted',
        waitlistEntry: serializedWaitlist,
        message: evaluation.reason,
      };
    }

    // Determine status based on evaluation
    const status = evaluation.decision === 'AUTO_CONFIRM'
      ? ReservationStatus.CONFIRMED
      : ReservationStatus.PENDING;

    const reservation = await prisma.reservation.create({
      data: {
        guestName: input.guestName,
        email: input.email,
        phone: formattedPhone,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        notes: input.notes,
        source: input.source,
        status,
      },
    });

    // Log creation in history
    await logReservationChange(
      reservation.id,
      'CREATED',
      input.source === 'WEB' ? 'GUEST' : 'STAFF',
      undefined,
      {
        guestName: reservation.guestName,
        email: reservation.email,
        phone: reservation.phone,
        date: reservation.date,
        time: reservation.time,
        partySize: reservation.partySize,
        status: reservation.status,
      },
      evaluation.reason
    );

    // If auto-confirmed, log that too
    if (status === ReservationStatus.CONFIRMED) {
      await logReservationChange(
        reservation.id,
        'CONFIRMED',
        'SYSTEM',
        undefined,
        undefined,
        evaluation.reason
      );
    }

    // Send appropriate email
    if (status === ReservationStatus.CONFIRMED) {
      await sendReservationConfirmation(
        input.email,
        input.guestName,
        formatDateLocal(input.date),
        input.time,
        input.partySize,
        reservation.cancelToken
      );
    } else {
      await sendReservationPending(
        input.email,
        input.guestName,
        formatDateLocal(input.date),
        input.time,
        input.partySize,
        reservation.cancelToken
      );
    }

    // Serialize reservation date as YYYY-MM-DD to avoid client timezone interpretation issues
    const serializedReservation = { ...reservation, date: formatDateLocal(reservation.date as Date) };

    return {
      status: status === ReservationStatus.CONFIRMED ? 'confirmed' : 'pending',
      reservation: serializedReservation as any,
      message: evaluation.reason,
    };
  }

  /**
   * Determine if a reservation should be auto-confirmed
   */
  private async shouldAutoConfirm(
    date: Date,
    time: string,
    partySize: number,
    now: Date
  ): Promise<{ shouldConfirm: boolean; shouldWaitlist: boolean; reason?: string }> {
    const rules = config.businessRules;

    // Rule 1: Party size exceeds max auto-confirm
    if (partySize > rules.maxAutoConfirmPartySize) {
      return {
        shouldConfirm: false,
        shouldWaitlist: false,
        reason: 'Party size too large for auto-confirm',
      };
    }

    // Rule 2: Outside opening hours
    if (!this.isWithinOpeningHours(time)) {
      return {
        shouldConfirm: false,
        shouldWaitlist: false,
        reason: 'Requested time outside opening hours',
      };
    }

    // Rule 3: Insufficient notice
    const requestedDateTime = this.combineDateAndTime(date, time);
    const minutesUntilReservation = (requestedDateTime.getTime() - now.getTime()) / (1000 * 60);
    
    if (minutesUntilReservation < rules.minNoticeMinutes) {
      return {
        shouldConfirm: false,
        shouldWaitlist: false,
        reason: 'Insufficient advance notice',
      };
    }

    // Rule 4: Check capacity
    const currentCovers = await this.getCoversForTimeSlot(date, time);
    
    if (currentCovers + partySize > rules.maxCoversPerTimeSlot) {
      return {
        shouldConfirm: false,
        shouldWaitlist: true,
        reason: 'Capacity exceeded',
      };
    }

    // All rules passed
    return { shouldConfirm: true, shouldWaitlist: false };
  }

  /**
   * Check if time is within opening hours
   */
  private isWithinOpeningHours(time: string): boolean {
    const rules = config.businessRules;
    const openingTime = rules.openingTime;
    const closingTime = rules.closingTime;

    return time >= openingTime && time <= closingTime;
  }

  /**
   * Combine date and time into a single Date object
   */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  /**
   * Get total covers for a specific time slot
   */
  private async getCoversForTimeSlot(date: Date, time: string): Promise<number> {
    const reservations = await prisma.reservation.findMany({
      where: {
        date,
        time,
        status: ReservationStatus.CONFIRMED,
      },
    });

    return reservations.reduce((total, res) => total + res.partySize, 0);
  }

  /**
   * Get reservations with flexible date filtering
   */
  async getReservations(filters: {
    date?: Date;
    fromDate?: Date;
    toDate?: Date;
    status?: ReservationStatus;
  }): Promise<Reservation[]> {
    const where: any = {};

    // Exact date match takes precedence
    if (filters.date) {
      where.date = filters.date;
    } else {
      // Date range filtering
      if (filters.fromDate || filters.toDate) {
        where.date = {};
        if (filters.fromDate) {
          where.date.gte = filters.fromDate;
        }
        if (filters.toDate) {
          where.date.lte = filters.toDate;
        }
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.reservation.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  /**
   * Get a single reservation by ID
   */
  async getReservationById(id: string): Promise<Reservation | null> {
    return prisma.reservation.findUnique({
      where: { id },
    });
  }

  /**
   * Update reservation with any allowed fields
   */
  async updateReservation(
    id: string,
    updates: {
      guestName?: string;
      email?: string;
      phone?: string;
      date?: string;
      time?: string;
      partySize?: number;
      status?: ReservationStatus;
      notes?: string;
    }
  ): Promise<Reservation> {
    // Format phone if provided
    const data: any = { ...updates };
    if (updates.phone) {
      const digits = updates.phone.replace(/\D/g, '');
      data.phone = digits.length === 11
        ? `+${digits[0]} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7,11)}`
        : updates.phone;
    }
    // Convert date string to Date object if provided
    if (updates.date) {
      data.date = new Date(updates.date);
    }

    return prisma.reservation.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a reservation permanently
   */
  async deleteReservation(id: string): Promise<void> {
    await prisma.reservation.delete({
      where: { id },
    });
  }

  /**
   * Cancel a reservation and attempt waitlist promotion
   */
  async cancelReservation(id: string): Promise<Reservation> {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });

    // Try to promote someone from the waitlist
    await this.waitlistService.tryPromoteNext(reservation.date, reservation.time);

    return reservation;
  }

  /**
   * Cancel reservation by cancel token (for guest use)
   */
  async cancelByToken(cancelToken: string): Promise<Reservation> {
    const reservation = await prisma.reservation.findUnique({
      where: { cancelToken },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new Error('Reservation already cancelled');
    }

    // Log guest cancellation
    await logReservationChange(
      reservation.id,
      'CANCELLED',
      'GUEST',
      { status: reservation.status },
      { status: 'CANCELLED' },
      'Guest cancelled via email link'
    );

    return this.cancelReservation(reservation.id);
  }

  /**
   * Get reservation by cancel token (for guest use)
   */
  async getByToken(cancelToken: string): Promise<Reservation | null> {
    return prisma.reservation.findUnique({
      where: { cancelToken },
    });
  }

  /**
   * Update reservation by cancel token (for guest use)
   * @param setToPending - If true, sets status back to PENDING after guest edits
   */
  async updateByToken(
    cancelToken: string,
    updates: {
      date?: Date;
      time?: string;
      partySize?: number;
      notes?: string;
    },
    setToPending: boolean = true
  ): Promise<Reservation> {
    const reservation = await prisma.reservation.findUnique({
      where: { cancelToken },
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const data: any = { ...updates };
    
    // If guest edits their reservation, set it back to PENDING for review
    if (setToPending && Object.keys(updates).length > 0) {
      data.status = ReservationStatus.PENDING;
    }

    const updated = await prisma.reservation.update({
      where: { cancelToken },
      data,
    });

    // Log guest update
    await logReservationChange(
      reservation.id,
      'UPDATED',
      'GUEST',
      {
        date: reservation.date,
        time: reservation.time,
        partySize: reservation.partySize,
        status: reservation.status,
      },
      {
        date: updated.date,
        time: updated.time,
        partySize: updated.partySize,
        status: updated.status,
      },
      'Guest updated via email link'
    );

    return updated;
  }
}

