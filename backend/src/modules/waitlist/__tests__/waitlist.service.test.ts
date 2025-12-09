import { WaitlistService } from '../waitlist.service';
import { prisma } from '../../../lib/db';
import { WaitlistStatus, ReservationStatus } from '@prisma/client';

// Mock Prisma client
jest.mock('../../../lib/db', () => ({
  prisma: {
    waitlistEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock email functions
jest.mock('../../../lib/email', () => ({
  sendWaitlistPromotion: jest.fn(),
}));

describe('WaitlistService', () => {
  let service: WaitlistService;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

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

      mockPrisma.waitlistEntry.create.mockResolvedValue(mockEntry);

      const result = await service.createEntry(input);

      expect(result).toEqual(mockEntry);
      expect(mockPrisma.waitlistEntry.create).toHaveBeenCalledWith({
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

      mockPrisma.waitlistEntry.findMany.mockResolvedValue([mockWaitlistEntry]);

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

      mockPrisma.reservation.findMany.mockResolvedValue(existingReservations);

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

      mockPrisma.reservation.create.mockResolvedValue(mockReservation);

      const updatedEntry = {
        ...mockWaitlistEntry,
        status: WaitlistStatus.PROMOTED,
        linkedReservationId: mockReservation.id,
        promotedAt: new Date(),
      };

      mockPrisma.waitlistEntry.update.mockResolvedValue(updatedEntry);

      const result = await service.tryPromoteNext(date, time);

      expect(result.promoted).toBe(true);
      expect(result.reservation).toBeDefined();
      expect(result.waitlistEntry?.status).toBe(WaitlistStatus.PROMOTED);
      expect(mockPrisma.reservation.create).toHaveBeenCalled();
    });

    it('should not promote when no waiting entries exist', async () => {
      mockPrisma.waitlistEntry.findMany.mockResolvedValue([]);

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

      mockPrisma.waitlistEntry.findMany.mockResolvedValue([mockWaitlistEntry]);

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

      mockPrisma.reservation.findMany.mockResolvedValue(existingReservations);

      const result = await service.tryPromoteNext(date, time);

      expect(result.promoted).toBe(false);
      expect(mockPrisma.reservation.create).not.toHaveBeenCalled();
    });
  });

  describe('expireOldEntries', () => {
    it('should mark old waiting entries as expired', async () => {
      mockPrisma.waitlistEntry.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.expireOldEntries();

      expect(result).toBe(3);
      expect(mockPrisma.waitlistEntry.updateMany).toHaveBeenCalledWith({
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
