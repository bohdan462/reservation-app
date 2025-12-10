import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { z } from 'zod';

const operatingHoursSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6),
  isClosed: z.boolean(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  servicePeriods: z.array(z.object({
    name: z.string(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  })).optional(),
});

const specialDateSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string(),
  isClosed: z.boolean(),
  customOpenTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  customCloseTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  customAutoAcceptMax: z.number().int().positive().nullable().optional(),
  customRequireDepositMin: z.number().int().positive().nullable().optional(),
  customWaitlistThreshold: z.number().min(0).max(1).nullable().optional(),
  customPendingThreshold: z.number().min(0).max(1).nullable().optional(),
});

const updateSettingsSchema = z.object({
  restaurantName: z.string().optional(),
  capacity: z.object({
    diningRoomSeats: z.number().int().positive().optional(),
    barSeats: z.number().int().positive().optional(),
    outdoorSeats: z.number().int().positive().optional(),
    maxReservationsPerSlot: z.number().int().positive().optional(),
    turnoverMinutes: z.number().int().positive().optional(),
  }).optional(),
  businessRules: z.object({
    autoAcceptMaxPartySize: z.number().int().positive().optional(),
    requireDepositMinPartySize: z.number().int().positive().optional(),
    maxDaysInAdvance: z.number().int().positive().optional(),
    minHoursInAdvance: z.number().int().positive().optional(),
    autoWaitlistThreshold: z.number().min(0).max(1).optional(),
    autoPendingThreshold: z.number().min(0).max(1).optional(),
    largePartyNeedsApproval: z.boolean().optional(),
    largePartyMinSize: z.number().int().positive().optional(),
    allowSameDayBooking: z.boolean().optional(),
    sameDayCutoffHour: z.number().int().min(0).max(23).optional(),
  }).optional(),
  operatingHours: z.array(operatingHoursSchema).optional(),
  specialDates: z.array(specialDateSchema).optional(),
});

export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  /**
   * Get restaurant settings - GET /api/settings
   */
  getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await this.settingsService.getSettings();

      // Format response for iOS app
      res.json({
        settings: {
          id: settings.id,
          restaurantName: settings.restaurantName,
          capacity: {
            diningRoomSeats: settings.diningRoomSeats,
            barSeats: settings.barSeats,
            outdoorSeats: settings.outdoorSeats,
            totalCapacity: settings.diningRoomSeats + settings.barSeats + settings.outdoorSeats,
            maxReservationsPerSlot: settings.maxReservationsPerSlot,
            turnoverMinutes: settings.turnoverMinutes,
          },
          businessRules: {
            autoAcceptMaxPartySize: settings.autoAcceptMaxPartySize,
            requireDepositMinPartySize: settings.requireDepositMinPartySize,
            maxDaysInAdvance: settings.maxDaysInAdvance,
            minHoursInAdvance: settings.minHoursInAdvance,
            autoWaitlistThreshold: settings.autoWaitlistThreshold,
            autoPendingThreshold: settings.autoPendingThreshold,
            largePartyNeedsApproval: settings.largePartyNeedsApproval,
            largePartyMinSize: settings.largePartyMinSize,
            allowSameDayBooking: settings.allowSameDayBooking,
            sameDayCutoffHour: settings.sameDayCutoffHour,
          },
          operatingHours: settings.operatingHours.map((oh) => ({
            id: oh.id,
            dayOfWeek: oh.dayOfWeek,
            isClosed: oh.isClosed,
            openTime: oh.openTime,
            closeTime: oh.closeTime,
            servicePeriods: oh.servicePeriods.map((sp) => ({
              name: sp.name,
              startTime: sp.startTime,
              endTime: sp.endTime,
            })),
          })),
          specialDates: settings.specialDates.map((sd) => ({
            id: sd.id,
            date: sd.date,
            name: sd.name,
            isClosed: sd.isClosed,
            customHours: sd.customOpenTime && sd.customCloseTime
              ? { openTime: sd.customOpenTime, closeTime: sd.customCloseTime }
              : undefined,
            customRules: {
              customAutoAcceptMax: sd.customAutoAcceptMax,
              customRequireDepositMin: sd.customRequireDepositMin,
              customWaitlistThreshold: sd.customWaitlistThreshold,
              customPendingThreshold: sd.customPendingThreshold,
            },
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Update restaurant settings - POST /api/settings
   */
  updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = updateSettingsSchema.parse(req.body);
      const updatedSettings = await this.settingsService.updateSettings(validatedData);

      res.json({
        settings: {
          id: updatedSettings.id,
          restaurantName: updatedSettings.restaurantName,
          capacity: {
            diningRoomSeats: updatedSettings.diningRoomSeats,
            barSeats: updatedSettings.barSeats,
            outdoorSeats: updatedSettings.outdoorSeats,
            totalCapacity: updatedSettings.diningRoomSeats + updatedSettings.barSeats + updatedSettings.outdoorSeats,
            maxReservationsPerSlot: updatedSettings.maxReservationsPerSlot,
            turnoverMinutes: updatedSettings.turnoverMinutes,
          },
          businessRules: {
            autoAcceptMaxPartySize: updatedSettings.autoAcceptMaxPartySize,
            requireDepositMinPartySize: updatedSettings.requireDepositMinPartySize,
            maxDaysInAdvance: updatedSettings.maxDaysInAdvance,
            minHoursInAdvance: updatedSettings.minHoursInAdvance,
            autoWaitlistThreshold: updatedSettings.autoWaitlistThreshold,
            autoPendingThreshold: updatedSettings.autoPendingThreshold,
            largePartyNeedsApproval: updatedSettings.largePartyNeedsApproval,
            largePartyMinSize: updatedSettings.largePartyMinSize,
            allowSameDayBooking: updatedSettings.allowSameDayBooking,
            sameDayCutoffHour: updatedSettings.sameDayCutoffHour,
          },
          operatingHours: updatedSettings.operatingHours.map((oh) => ({
            id: oh.id,
            dayOfWeek: oh.dayOfWeek,
            isClosed: oh.isClosed,
            openTime: oh.openTime,
            closeTime: oh.closeTime,
            servicePeriods: oh.servicePeriods.map((sp) => ({
              name: sp.name,
              startTime: sp.startTime,
              endTime: sp.endTime,
            })),
          })),
          specialDates: updatedSettings.specialDates.map((sd) => ({
            id: sd.id,
            date: sd.date,
            name: sd.name,
            isClosed: sd.isClosed,
            customHours: sd.customOpenTime && sd.customCloseTime
              ? { openTime: sd.customOpenTime, closeTime: sd.customCloseTime }
              : undefined,
            customRules: {
              customAutoAcceptMax: sd.customAutoAcceptMax,
              customRequireDepositMin: sd.customRequireDepositMin,
              customWaitlistThreshold: sd.customWaitlistThreshold,
              customPendingThreshold: sd.customPendingThreshold,
            },
          })),
        },
        message: 'Settings saved successfully',
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
