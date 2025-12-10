import { WaitlistService } from '../waitlist.service';
import { prisma } from '../../../lib/db';
import { WaitlistStatus, ReservationStatus } from '@prisma/client';

// Remove jest.mock for Prisma
// Replace mockPrisma references with actual Prisma client calls

// Mock email functions
jest.mock('../../../lib/email', () => ({
  sendWaitlistPromotion: jest.fn(),
}));

describe('WaitlistService', () => {
  let service: WaitlistService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WaitlistService();
  });

  describe('createEntry', () => {
    it('should create a waitlist entry', async () => {
      const input = {
        guestName: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        date: new Date('2025-12-15'),
        time: '19:00',
        partySize: 4,
      };

      const mockEntry = {
        id: 'w1',
        ...input,
        status: WaitlistStatus.WAITING,
        linkedReservationId: null,
        createdAt: new Date(),
        promotedAt: null,
      };

      prisma.waitlistEntry.create = jest.fn().mockResolvedValue(mockEntry);

      const result = await service.createEntry(input);

      expect(result).toEqual(mockEntry);
      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: WaitlistStatus.WAITING,
        }),
      });
    });
  });

  describe('tryPromoteNext', () => {
    const date = new Date('2025-12-15');
    const time = '19:00';

    it('should promote the first waiting entry when capacity allows', async () => {
      const mockWaitlistEntry = {
        id: 'w1',
        guestName: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        date,
        time,
        partySize: 4,
        status: WaitlistStatus.WAITING,
        linkedReservationId: null,
        createdAt: new Date(),
        promotedAt: null,
      };

      prisma.waitlistEntry.findMany = jest.fn().mockResolvedValue([mockWaitlistEntry]);

      // Mock current capacity (30 covers)
      const existingReservations = [
        {
          id: '1',
          guestName: 'Guest',
          email: 'guest@example.com',
          phone: '+1234567890',
          date,
          time,
          partySize: 30,
          status: ReservationStatus.CONFIRMED,
          source: 'WEB' as const,
          notes: null,
          cancelToken: 'token1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.reservation.findMany = jest.fn().mockResolvedValue(existingReservations);

      const mockReservation = {
        id: 'r1',
        guestName: mockWaitlistEntry.guestName,
        email: mockWaitlistEntry.email!,
        phone: mockWaitlistEntry.phone!,
        date: mockWaitlistEntry.date,
        time: mockWaitlistEntry.time,
        partySize: mockWaitlistEntry.partySize,
        status: ReservationStatus.CONFIRMED,
        source: 'IN_HOUSE' as const,
        notes: 'Promoted from waitlist',
        cancelToken: 'token2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.reservation.create = jest.fn().mockResolvedValue(mockReservation);

      const updatedEntry = {
        ...mockWaitlistEntry,
        status: WaitlistStatus.PROMOTED,
        linkedReservationId: mockReservation.id,
        promotedAt: new Date(),
      };

      prisma.waitlistEntry.update = jest.fn().mockResolvedValue(updatedEntry);

      const result = await service.tryPromoteNext(date, time);

      expect(result.promoted).toBe(true);
      expect(result.reservation).toBeDefined();
      expect(result.waitlistEntry?.status).toBe(WaitlistStatus.PROMOTED);
      expect(prisma.reservation.create).toHaveBeenCalled();
    });

    it('should not promote when no waiting entries exist', async () => {
      prisma.waitlistEntry.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.tryPromoteNext(date, time);

      expect(result.promoted).toBe(false);
      expect(result.reservation).toBeUndefined();
    });

    it('should not promote when capacity is full', async () => {
      const mockWaitlistEntry = {
        id: 'w1',
        guestName: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        date,
        time,
        partySize: 10,
        status: WaitlistStatus.WAITING,
        linkedReservationId: null,
        createdAt: new Date(),
        promotedAt: null,
      };

      prisma.waitlistEntry.findMany = jest.fn().mockResolvedValue([mockWaitlistEntry]);

      // Mock full capacity (50 covers)
      const existingReservations = [
        {
          id: '1',
          guestName: 'Guest',
          email: 'guest@example.com',
          phone: '+1234567890',
          date,
          time,
          partySize: 50,
          status: ReservationStatus.CONFIRMED,
          source: 'WEB' as const,
          notes: null,
          cancelToken: 'token1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.reservation.findMany = jest.fn().mockResolvedValue(existingReservations);

      const result = await service.tryPromoteNext(date, time);

      expect(result.promoted).toBe(false);
      expect(prisma.reservation.create).not.toHaveBeenCalled();
    });
  });

  describe('expireOldEntries', () => {
    it('should mark old waiting entries as expired', async () => {
      prisma.waitlistEntry.updateMany = jest.fn().mockResolvedValue({ count: 3 });

      const result = await service.expireOldEntries();

      expect(result).toBe(3);
      expect(prisma.waitlistEntry.updateMany).toHaveBeenCalledWith({
        where: {
          status: WaitlistStatus.WAITING,
          date: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: WaitlistStatus.EXPIRED,
        },
      });
    });
  });
});
