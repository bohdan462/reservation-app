import { prisma } from '../../lib/db';
import { ReservationStatus } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';
import { formatDateLocal } from '../../lib/serialize';

export interface DashboardStats {
  todayStats: {
    totalReservations: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    totalGuests: number;
    averagePartySize: number;
  };
  upcomingStats: {
    next7Days: number;
    next30Days: number;
    waitlistCount: number;
  };
  capacityStatus: {
    currentOccupancy: number;
    maxCapacity: number;
    utilizationPercent: number;
    peakHourToday: string | null;
    availableSlots: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    reservationId: string;
  }>;
}

export class DashboardService {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = formatDateLocal(today);
    const now = new Date();

    // Get settings
    const settings = await this.settingsService.getSettings();

    // Today's reservations
    const todayReservations = await prisma.reservation.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const todayStats = {
      totalReservations: todayReservations.length,
      confirmed: todayReservations.filter((r) => r.status === ReservationStatus.CONFIRMED).length,
      pending: todayReservations.filter((r) => r.status === ReservationStatus.PENDING).length,
      cancelled: todayReservations.filter((r) => r.status === ReservationStatus.CANCELLED).length,
      totalGuests: todayReservations.reduce((sum, r) => r.partySize + sum, 0),
      averagePartySize:
        todayReservations.length > 0
          ? todayReservations.reduce((sum, r) => sum + r.partySize, 0) / todayReservations.length
          : 0,
    };

    // Upcoming counts
    const next7DaysDate = new Date(today);
    next7DaysDate.setDate(today.getDate() + 7);

    const next30DaysDate = new Date(today);
    next30DaysDate.setDate(today.getDate() + 30);

    const next7Days = await prisma.reservation.count({
      where: {
        date: { gte: today, lte: next7DaysDate },
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
      },
    });

    const next30Days = await prisma.reservation.count({
      where: {
        date: { gte: today, lte: next30DaysDate },
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
      },
    });

    const waitlistCount = await prisma.waitlistEntry.count({
      where: { status: 'WAITING' },
    });

    // Capacity status
    const confirmedToday = todayReservations.filter((r) => r.status === ReservationStatus.CONFIRMED);
    const currentOccupancy = confirmedToday.reduce((sum, r) => sum + r.partySize, 0);
    const maxCapacity = settings.diningRoomSeats + settings.barSeats + settings.outdoorSeats;

    // Find peak hour
    const hourCounts: { [key: string]: number } = {};
    confirmedToday.forEach((r) => {
      const hour = r.time.split(':')[0];
      hourCounts[hour] = (hourCounts[hour] || 0) + r.partySize;
    });
    const peakHour =
      Object.keys(hourCounts).length > 0
        ? Object.keys(hourCounts).reduce((a, b) => (hourCounts[a] > hourCounts[b] ? a : b))
        : null;

    // Recent activity from history (last 24 hours)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.reservationHistory.findMany({
      where: {
        createdAt: { gte: yesterday },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { reservation: true },
    });

    return {
      todayStats,
      upcomingStats: { next7Days, next30Days, waitlistCount },
      capacityStatus: {
        currentOccupancy,
        maxCapacity,
        utilizationPercent: maxCapacity > 0 ? currentOccupancy / maxCapacity : 0,
        peakHourToday: peakHour ? `${peakHour}:00` : null,
        availableSlots: 0, // TODO: Calculate based on turnover logic
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        type: a.changeType,
        message: this.generateActivityMessage(a),
        timestamp: a.createdAt.toISOString(),
        reservationId: a.reservationId,
      })),
    };
  }

  /**
   * Generate human-readable activity message
   */
  private generateActivityMessage(activity: any): string {
    const guestName = activity.reservation?.guestName || 'Guest';
    const actor = activity.actor.toLowerCase();

    switch (activity.changeType) {
      case 'CREATED':
        return `${guestName}'s reservation created by ${actor}`;
      case 'UPDATED':
        return `${guestName}'s reservation updated by ${actor}`;
      case 'CANCELLED':
        return `${guestName}'s reservation cancelled by ${actor}`;
      case 'CONFIRMED':
        return `${guestName}'s reservation confirmed by ${actor}`;
      case 'SEATED':
        return `${guestName} seated`;
      case 'NO_SHOW':
        return `${guestName} marked as no-show`;
      default:
        return `Reservation ${activity.changeType.toLowerCase()}`;
    }
  }
}
