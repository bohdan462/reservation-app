import { WaitlistEntry, WaitlistStatus, ReservationStatus } from '@prisma/client';
import { prisma } from '../../lib/db';
import { config } from '../../config';
import { sendWaitlistPromotion } from '../../lib/email';
import { formatDateLocal } from '../../lib/serialize';

export interface CreateWaitlistInput {
  guestName: string;
  email?: string;
  phone?: string;
  date: Date;
  time: string;
  partySize: number;
}

export class WaitlistService {
  /**
   * Create a new waitlist entry
   */
  async createEntry(input: CreateWaitlistInput): Promise<WaitlistEntry> {
    return prisma.waitlistEntry.create({
      data: {
        guestName: input.guestName,
        email: input.email,
        phone: input.phone,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        status: WaitlistStatus.WAITING,
      },
    });
  }

  /**
   * Get waitlist entries by date and optional status
   */
  async getEntries(date?: Date, status?: WaitlistStatus): Promise<WaitlistEntry[]> {
    return prisma.waitlistEntry.findMany({
      where: {
        ...(date && { date }),
        ...(status && { status }),
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Get a single waitlist entry by ID
   */
  async getEntryById(id: string): Promise<WaitlistEntry | null> {
    return prisma.waitlistEntry.findUnique({
      where: { id },
    });
  }

  /**
   * Update waitlist entry
   */
  async updateEntry(
    id: string,
    updates: { status?: WaitlistStatus; linkedReservationId?: string }
  ): Promise<WaitlistEntry> {
    return prisma.waitlistEntry.update({
      where: { id },
      data: updates,
    });
  }

  /**
   * Try to promote the next waitlist entry for a given date and time
   */
  async tryPromoteNext(date: Date, time: string): Promise<{
    promoted: boolean;
    reservation?: any;
    waitlistEntry?: WaitlistEntry;
  }> {
    // Find waiting entries for this date/time, ordered by creation time (FIFO)
    const waitingEntries = await prisma.waitlistEntry.findMany({
      where: {
        date,
        time,
        status: WaitlistStatus.WAITING,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (waitingEntries.length === 0) {
      return { promoted: false };
    }

    const rules = config.businessRules;

    // Check current capacity
    const currentCovers = await this.getCoversForTimeSlot(date, time);

    // Try to find an entry that fits
    for (const entry of waitingEntries) {
      if (currentCovers + entry.partySize <= rules.maxCoversPerTimeSlot) {
        // We can promote this entry
        const reservation = await prisma.reservation.create({
          data: {
            guestName: entry.guestName,
            email: entry.email || '',
            phone: entry.phone || '',
            date: entry.date,
            time: entry.time,
            partySize: entry.partySize,
            status: ReservationStatus.CONFIRMED,
            source: 'IN_HOUSE',
            notes: 'Promoted from waitlist',
          },
        });

        // Update waitlist entry
        const updatedEntry = await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: {
            status: WaitlistStatus.PROMOTED,
            linkedReservationId: reservation.id,
            promotedAt: new Date(),
          },
        });

        // Send promotion email
        if (entry.email) {
          await sendWaitlistPromotion(
            entry.email,
            entry.guestName,
            formatDateLocal(date),
            time,
            entry.partySize,
            reservation.cancelToken
          );
        }

        return {
          promoted: true,
          reservation,
          waitlistEntry: updatedEntry,
        };
      }
    }

    return { promoted: false };
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
   * Mark expired waitlist entries
   * This could be run on a schedule
   */
  async expireOldEntries(): Promise<number> {
    const now = new Date();
    const result = await prisma.waitlistEntry.updateMany({
      where: {
        status: WaitlistStatus.WAITING,
        date: {
          lt: now,
        },
      },
      data: {
        status: WaitlistStatus.EXPIRED,
      },
    });

    return result.count;
  }
}
