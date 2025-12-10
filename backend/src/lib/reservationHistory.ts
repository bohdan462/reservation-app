import { PrismaClient, ReservationChangeType, ChangeActor } from '@prisma/client';

const prisma = new PrismaClient();

interface HistoryData {
  guestName?: string;
  email?: string;
  phone?: string;
  date?: Date | string;
  time?: string;
  partySize?: number;
  status?: string;
  notes?: string;
}

/**
 * Log a reservation change to the history table
 */
export async function logReservationChange(
  reservationId: string,
  changeType: ReservationChangeType,
  actor: ChangeActor,
  previousData?: HistoryData,
  newData?: HistoryData,
  notes?: string
): Promise<void> {
  try {
    await prisma.reservationHistory.create({
      data: {
        reservationId,
        changeType,
        actor,
        previousData: previousData ? JSON.parse(JSON.stringify(previousData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
        notes,
      },
    });
    console.log(`[HISTORY] Logged ${changeType} by ${actor} for reservation ${reservationId}`);
  } catch (error) {
    console.error('[HISTORY] Failed to log reservation change:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

/**
 * Get complete history for a reservation
 */
export async function getReservationHistory(reservationId: string) {
  return prisma.reservationHistory.findMany({
    where: { reservationId },
    orderBy: { createdAt: 'asc' },
  });
}
