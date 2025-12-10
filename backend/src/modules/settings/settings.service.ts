import { RestaurantSettings, OperatingHours, SpecialDate, ServicePeriod, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';

export type RestaurantSettingsWithRelations = Prisma.RestaurantSettingsGetPayload<{
  include: {
    operatingHours: {
      include: {
        servicePeriods: true
      }
    }
    specialDates: true
  }
}>

export interface SettingsUpdateInput {
  restaurantName?: string;
  capacity?: {
    diningRoomSeats?: number;
    barSeats?: number;
    outdoorSeats?: number;
    maxReservationsPerSlot?: number;
    turnoverMinutes?: number;
  };
  businessRules?: {
    autoAcceptMaxPartySize?: number;
    requireDepositMinPartySize?: number;
    maxDaysInAdvance?: number;
    minHoursInAdvance?: number;
    autoWaitlistThreshold?: number;
    autoPendingThreshold?: number;
    largePartyNeedsApproval?: boolean;
    largePartyMinSize?: number;
    allowSameDayBooking?: boolean;
    sameDayCutoffHour?: number;
  };
  operatingHours?: Array<{
    id?: string;
    dayOfWeek: number;
    isClosed: boolean;
    openTime: string;
    closeTime: string;
    servicePeriods?: Array<{
      name: string;
      startTime: string;
      endTime: string;
    }>;
  }>;
  specialDates?: Array<{
    id?: string;
    date: string;
    name: string;
    isClosed: boolean;
    customOpenTime?: string | null;
    customCloseTime?: string | null;
    customAutoAcceptMax?: number | null;
    customRequireDepositMin?: number | null;
    customWaitlistThreshold?: number | null;
    customPendingThreshold?: number | null;
  }>;
}

export class SettingsService {
  /**
   * Get restaurant settings (creates default if doesn't exist)
   */
  async getSettings(): Promise<RestaurantSettingsWithRelations> {
    let settings = await prisma.restaurantSettings.findFirst({
      where: { restaurantId: 'default' },
      include: {
        operatingHours: {
          include: {
            servicePeriods: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        specialDates: {
          orderBy: { date: 'asc' },
        },
      },
    });

    // Create default settings if doesn't exist
    if (!settings) {
      settings = await this.createDefaultSettings();
    }

    return settings;
  }

  /**
   * Update restaurant settings
   */
  async updateSettings(input: SettingsUpdateInput): Promise<RestaurantSettingsWithRelations> {
    const currentSettings = await this.getSettings();

    // Build update data for main settings
    const updateData: any = {};
    
    if (input.restaurantName) {
      updateData.restaurantName = input.restaurantName;
    }

    if (input.capacity) {
      if (input.capacity.diningRoomSeats !== undefined) updateData.diningRoomSeats = input.capacity.diningRoomSeats;
      if (input.capacity.barSeats !== undefined) updateData.barSeats = input.capacity.barSeats;
      if (input.capacity.outdoorSeats !== undefined) updateData.outdoorSeats = input.capacity.outdoorSeats;
      if (input.capacity.maxReservationsPerSlot !== undefined) updateData.maxReservationsPerSlot = input.capacity.maxReservationsPerSlot;
      if (input.capacity.turnoverMinutes !== undefined) updateData.turnoverMinutes = input.capacity.turnoverMinutes;
    }

    if (input.businessRules) {
      if (input.businessRules.autoAcceptMaxPartySize !== undefined) updateData.autoAcceptMaxPartySize = input.businessRules.autoAcceptMaxPartySize;
      if (input.businessRules.requireDepositMinPartySize !== undefined) updateData.requireDepositMinPartySize = input.businessRules.requireDepositMinPartySize;
      if (input.businessRules.maxDaysInAdvance !== undefined) updateData.maxDaysInAdvance = input.businessRules.maxDaysInAdvance;
      if (input.businessRules.minHoursInAdvance !== undefined) updateData.minHoursInAdvance = input.businessRules.minHoursInAdvance;
      if (input.businessRules.autoWaitlistThreshold !== undefined) updateData.autoWaitlistThreshold = input.businessRules.autoWaitlistThreshold;
      if (input.businessRules.autoPendingThreshold !== undefined) updateData.autoPendingThreshold = input.businessRules.autoPendingThreshold;
      if (input.businessRules.largePartyNeedsApproval !== undefined) updateData.largePartyNeedsApproval = input.businessRules.largePartyNeedsApproval;
      if (input.businessRules.largePartyMinSize !== undefined) updateData.largePartyMinSize = input.businessRules.largePartyMinSize;
      if (input.businessRules.allowSameDayBooking !== undefined) updateData.allowSameDayBooking = input.businessRules.allowSameDayBooking;
      if (input.businessRules.sameDayCutoffHour !== undefined) updateData.sameDayCutoffHour = input.businessRules.sameDayCutoffHour;
    }

    // Update main settings
    const updatedSettings = await prisma.restaurantSettings.update({
      where: { id: currentSettings.id },
      data: updateData,
      include: {
        operatingHours: {
          include: {
            servicePeriods: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        specialDates: {
          orderBy: { date: 'asc' },
        },
      },
    });

    // Update operating hours if provided
    if (input.operatingHours) {
      // Delete existing and recreate (simpler than complex upsert logic)
      await prisma.operatingHours.deleteMany({
        where: { restaurantId: 'default' },
      });

      for (const hours of input.operatingHours) {
        await prisma.operatingHours.create({
          data: {
            restaurantId: 'default',
            dayOfWeek: hours.dayOfWeek,
            isClosed: hours.isClosed,
            openTime: hours.openTime,
            closeTime: hours.closeTime,
            servicePeriods: hours.servicePeriods
              ? {
                  create: hours.servicePeriods.map((sp) => ({
                    name: sp.name,
                    startTime: sp.startTime,
                    endTime: sp.endTime,
                  })),
                }
              : undefined,
          },
        });
      }
    }

    // Update special dates if provided
    if (input.specialDates) {
      // Delete existing and recreate
      await prisma.specialDate.deleteMany({
        where: { restaurantId: 'default' },
      });

      for (const date of input.specialDates) {
        await prisma.specialDate.create({
          data: {
            restaurantId: 'default',
            date: date.date,
            name: date.name,
            isClosed: date.isClosed,
            customOpenTime: date.customOpenTime,
            customCloseTime: date.customCloseTime,
            customAutoAcceptMax: date.customAutoAcceptMax,
            customRequireDepositMin: date.customRequireDepositMin,
            customWaitlistThreshold: date.customWaitlistThreshold,
            customPendingThreshold: date.customPendingThreshold,
          },
        });
      }
    }

    // Fetch and return updated settings with relations
    return this.getSettings();
  }

  /**
   * Create default settings with standard operating hours
   */
  private async createDefaultSettings(): Promise<RestaurantSettingsWithRelations> {
    const settings = await prisma.restaurantSettings.create({
      data: {
        restaurantId: 'default',
        restaurantName: 'My Restaurant',
        operatingHours: {
          create: [
            // Sunday
            { dayOfWeek: 0, isClosed: false, openTime: '17:00', closeTime: '22:00' },
            // Monday
            { dayOfWeek: 1, isClosed: false, openTime: '17:00', closeTime: '22:00' },
            // Tuesday
            { dayOfWeek: 2, isClosed: false, openTime: '17:00', closeTime: '22:00' },
            // Wednesday
            { dayOfWeek: 3, isClosed: false, openTime: '17:00', closeTime: '22:00' },
            // Thursday
            { dayOfWeek: 4, isClosed: false, openTime: '17:00', closeTime: '22:00' },
            // Friday
            { dayOfWeek: 5, isClosed: false, openTime: '17:00', closeTime: '23:00' },
            // Saturday
            { dayOfWeek: 6, isClosed: false, openTime: '17:00', closeTime: '23:00' },
          ],
        },
      },
      include: {
        operatingHours: {
          include: {
            servicePeriods: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
        specialDates: {
          orderBy: { date: 'asc' },
        },
      },
    });

    return settings;
  }
}
