import { prisma } from '../../lib/db';
import { SettingsService } from '../settings/settings.service';
import { ReservationStatus } from '@prisma/client';

export type EvaluationDecision = 'AUTO_CONFIRM' | 'PENDING' | 'WAITLIST' | 'REJECT';

export interface EvaluationRequest {
  date: string; // ISO date "2025-12-15"
  time: string; // "19:00"
  partySize: number;
  source?: string; // "WEB", "IPAD_APP", "PHONE"
}

export interface EvaluationResult {
  decision: EvaluationDecision;
  reason: string;
  metadata: {
    currentCapacityPercent: number;
    reservationsInSlot: number;
    totalGuests: number;
    hoursInAdvance: number;
    isWithinOperatingHours: boolean;
  };
}

export class EvaluationService {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  /**
   * Evaluate a reservation request and return decision
   */
  async evaluateReservation(request: EvaluationRequest): Promise<EvaluationResult> {
    const settings = await this.settingsService.getSettings();
    const { date, time, partySize } = request;

    // Calculate hours in advance
    const hoursInAdvance = this.calculateHoursInAdvance(date, time);

    // 1. Check if restaurant is open
    const isOpen = this.checkOperatingHours(date, time, settings);
    if (!isOpen) {
      return {
        decision: 'REJECT',
        reason: 'Outside operating hours',
        metadata: {
          currentCapacityPercent: 0,
          reservationsInSlot: 0,
          totalGuests: 0,
          hoursInAdvance,
          isWithinOperatingHours: false,
        },
      };
    }

    // 2. Check advance booking window
    if (hoursInAdvance < settings.minHoursInAdvance) {
      return {
        decision: 'REJECT',
        reason: `Must book at least ${settings.minHoursInAdvance} hours in advance`,
        metadata: {
          currentCapacityPercent: 0,
          reservationsInSlot: 0,
          totalGuests: 0,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    if (hoursInAdvance > settings.maxDaysInAdvance * 24) {
      return {
        decision: 'REJECT',
        reason: `Cannot book more than ${settings.maxDaysInAdvance} days ahead`,
        metadata: {
          currentCapacityPercent: 0,
          reservationsInSlot: 0,
          totalGuests: 0,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    // 3. Check same-day rules
    if (hoursInAdvance < 24 && !settings.allowSameDayBooking) {
      return {
        decision: 'REJECT',
        reason: 'Same-day booking not allowed',
        metadata: {
          currentCapacityPercent: 0,
          reservationsInSlot: 0,
          totalGuests: 0,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    // Check if past same-day cutoff
    if (hoursInAdvance < 24) {
      const requestDateTime = new Date(`${date}T${time}:00`);
      const cutoffDateTime = new Date(date);
      cutoffDateTime.setHours(settings.sameDayCutoffHour, 0, 0, 0);
      
      if (new Date() > cutoffDateTime && requestDateTime.getDate() === cutoffDateTime.getDate()) {
        return {
          decision: 'REJECT',
          reason: `Same-day bookings must be made before ${settings.sameDayCutoffHour}:00`,
          metadata: {
            currentCapacityPercent: 0,
            reservationsInSlot: 0,
            totalGuests: 0,
            hoursInAdvance,
            isWithinOperatingHours: true,
          },
        };
      }
    }

    // 4. Check party size rules
    if (settings.largePartyNeedsApproval && partySize >= settings.largePartyMinSize) {
      const capacity = await this.calculateCapacity(date, time, settings);
      return {
        decision: 'PENDING',
        reason: `Large party (${partySize} guests) requires manager approval`,
        metadata: {
          currentCapacityPercent: capacity.utilization,
          reservationsInSlot: capacity.reservationCount,
          totalGuests: capacity.totalGuests,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    if (partySize >= settings.requireDepositMinPartySize) {
      const capacity = await this.calculateCapacity(date, time, settings);
      return {
        decision: 'PENDING',
        reason: `Party of ${partySize} requires deposit confirmation`,
        metadata: {
          currentCapacityPercent: capacity.utilization,
          reservationsInSlot: capacity.reservationCount,
          totalGuests: capacity.totalGuests,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    if (partySize > settings.autoAcceptMaxPartySize) {
      const capacity = await this.calculateCapacity(date, time, settings);
      return {
        decision: 'PENDING',
        reason: `Party size (${partySize}) exceeds auto-accept limit (${settings.autoAcceptMaxPartySize})`,
        metadata: {
          currentCapacityPercent: capacity.utilization,
          reservationsInSlot: capacity.reservationCount,
          totalGuests: capacity.totalGuests,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    // 5. Check capacity and slot availability
    const capacity = await this.calculateCapacity(date, time, settings);

    // Check slot limit
    if (capacity.reservationCount >= settings.maxReservationsPerSlot) {
      return {
        decision: 'WAITLIST',
        reason: `Time slot is full (${capacity.reservationCount} reservations)`,
        metadata: {
          currentCapacityPercent: capacity.utilization,
          reservationsInSlot: capacity.reservationCount,
          totalGuests: capacity.totalGuests,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    // Check capacity thresholds
    if (capacity.utilization >= settings.autoWaitlistThreshold) {
      return {
        decision: 'WAITLIST',
        reason: `Capacity at ${Math.round(capacity.utilization * 100)}% - adding to waitlist`,
        metadata: {
          currentCapacityPercent: capacity.utilization,
          reservationsInSlot: capacity.reservationCount,
          totalGuests: capacity.totalGuests,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    if (capacity.utilization >= settings.autoPendingThreshold) {
      return {
        decision: 'PENDING',
        reason: `Capacity at ${Math.round(capacity.utilization * 100)}% - requires review`,
        metadata: {
          currentCapacityPercent: capacity.utilization,
          reservationsInSlot: capacity.reservationCount,
          totalGuests: capacity.totalGuests,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    // Check if adding this party would exceed capacity
    const totalCapacity = settings.diningRoomSeats + settings.barSeats + settings.outdoorSeats;
    if (capacity.totalGuests + partySize > totalCapacity) {
      return {
        decision: 'WAITLIST',
        reason: `Would exceed capacity (${capacity.totalGuests + partySize}/${totalCapacity} guests)`,
        metadata: {
          currentCapacityPercent: capacity.utilization,
          reservationsInSlot: capacity.reservationCount,
          totalGuests: capacity.totalGuests,
          hoursInAdvance,
          isWithinOperatingHours: true,
        },
      };
    }

    // 6. All checks passed - auto-confirm
    return {
      decision: 'AUTO_CONFIRM',
      reason: 'All requirements met',
      metadata: {
        currentCapacityPercent: capacity.utilization,
        reservationsInSlot: capacity.reservationCount,
        totalGuests: capacity.totalGuests,
        hoursInAdvance,
        isWithinOperatingHours: true,
      },
    };
  }

  /**
   * Calculate capacity utilization for a specific time slot
   */
  private async calculateCapacity(date: string, time: string, settings: any) {
    const turnoverMinutes = settings.turnoverMinutes;

    // Get all CONFIRMED reservations for this date within turnover window
    const reservations = await prisma.reservation.findMany({
      where: {
        date: new Date(date),
        status: ReservationStatus.CONFIRMED,
      },
    });

    // Filter by time window (± turnover minutes)
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
   * Check if time is within operating hours
   */
  private checkOperatingHours(date: string, time: string, settings: any): boolean {
    // 1. Check special dates first
    const specialDate = settings.specialDates.find((sd: any) => sd.date === date);
    if (specialDate) {
      if (specialDate.isClosed) return false;
      if (specialDate.customOpenTime && specialDate.customCloseTime) {
        return this.isTimeInRange(time, specialDate.customOpenTime, specialDate.customCloseTime);
      }
    }

    // 2. Check regular operating hours
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0-6 (Sunday-Saturday)
    const hours = settings.operatingHours.find((h: any) => h.dayOfWeek === dayOfWeek);

    if (!hours || hours.isClosed) return false;

    return this.isTimeInRange(time, hours.openTime, hours.closeTime);
  }

  /**
   * Check if time is within range
   */
  private isTimeInRange(time: string, openTime: string, closeTime: string): boolean {
    return time >= openTime && time <= closeTime;
  }

  /**
   * Calculate hours in advance
   */
  private calculateHoursInAdvance(date: string, time: string): number {
    const reservationDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    const diffMs = reservationDateTime.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  }
}
