import { ReservationService } from '../reservation.service';
import { WaitlistService } from '../../waitlist/waitlist.service';
import { prisma } from '../../../lib/db';
import { ReservationStatus, ReservationSource } from '@prisma/client';

// Mock Prisma client
jest.mock('../../../lib/db', () => ({
  prisma: {
    reservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    waitlistEntry: {
      create: jest.fn(),
    },
  },
}));

// Mock WaitlistService
jest.mock('../../waitlist/waitlist.service');

// Mock email functions
jest.mock('../../../lib/email', () => ({
  sendReservationConfirmation: jest.fn(),
  sendReservationPending: jest.fn(),
  sendWaitlistConfirmation: jest.fn(),
}));

describe('ReservationService', () => {
  let service: ReservationService;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReservationService();
  });

  describe('createReservation', () => {
    const baseInput = {
      guestName: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      date: new Date('2025-12-15'),
      time: '19:00',
      partySize: 4,
      source: ReservationSource.WEB,
    };

    it('should auto-confirm reservation when all rules pass', async () => {
      // Mock: no existing reservations (capacity available)
      mockPrisma.reservation.findMany.mockResolvedValue([]);

      const mockReservation = {
        id: '1',
        ...baseInput,
        status: ReservationStatus.CONFIRMED,
        notes: null,
        cancelToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.reservation.create.mockResolvedValue(mockReservation);

      const result = await service.createReservation(baseInput);

      expect(result.status).toBe('confirmed');
      expect(result.reservation?.status).toBe(ReservationStatus.CONFIRMED);
      expect(mockPrisma.reservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: ReservationStatus.CONFIRMED,
        }),
      });
    });

    it('should set status to PENDING for large party size', async () => {
      const largePartyInput = {
        ...baseInput,
        partySize: 15, // exceeds maxAutoConfirmPartySize (8)
      };

      mockPrisma.reservation.findMany.mockResolvedValue([]);

      const mockReservation = {
        id: '1',
        ...largePartyInput,
        status: ReservationStatus.PENDING,
        notes: null,
        cancelToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.reservation.create.mockResolvedValue(mockReservation);

      const result = await service.createReservation(largePartyInput);

      expect(result.status).toBe('pending');
      expect(result.reservation?.status).toBe(ReservationStatus.PENDING);
    });

    it('should create waitlist entry when capacity exceeded', async () => {
      // Mock: existing reservations fill capacity
      const existingReservations = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `${i}`,
          guestName: 'Guest',
          email: 'guest@example.com',
          phone: '+1234567890',
          date: baseInput.date,
          time: baseInput.time,
          partySize: 5, // Total: 50 covers
          status: ReservationStatus.CONFIRMED,
          source: ReservationSource.WEB,
          notes: null,
          cancelToken: `token${i}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      mockPrisma.reservation.findMany.mockResolvedValue(existingReservations);

      const mockWaitlistEntry = {
        id: 'w1',
        guestName: baseInput.guestName,
        email: baseInput.email,
        phone: baseInput.phone,
        date: baseInput.date,
        time: baseInput.time,
        partySize: baseInput.partySize,
        status: 'WAITING' as const,
        linkedReservationId: null,
        createdAt: new Date(),
        promotedAt: null,
      };

      const mockWaitlistService = WaitlistService as jest.MockedClass<typeof WaitlistService>;
      mockWaitlistService.prototype.createEntry = jest
        .fn()
        .mockResolvedValue(mockWaitlistEntry);

      const result = await service.createReservation(baseInput);

      expect(result.status).toBe('waitlisted');
      expect(result.waitlistEntry).toBeDefined();
    });

    it('should set status to PENDING for reservations outside opening hours', async () => {
      const earlyInput = {
        ...baseInput,
        time: '09:00', // before opening time (11:00)
      };

      mockPrisma.reservation.findMany.mockResolvedValue([]);

      const mockReservation = {
        id: '1',
        ...earlyInput,
        status: ReservationStatus.PENDING,
        notes: null,
        cancelToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.reservation.create.mockResolvedValue(mockReservation);

      const result = await service.createReservation(earlyInput);

      expect(result.status).toBe('pending');
    });
  });

  describe('getReservations', () => {
    it('should fetch reservations by date', async () => {
      const date = new Date('2025-12-15');
      const mockReservations = [
        {
          id: '1',
          guestName: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          date,
          time: '19:00',
          partySize: 4,
          status: ReservationStatus.CONFIRMED,
          source: ReservationSource.WEB,
          notes: null,
          cancelToken: 'token1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.reservation.findMany.mockResolvedValue(mockReservations);

      const result = await service.getReservations(date);

      expect(result).toEqual(mockReservations);
      expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith({
        where: { date },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
      });
    });
  });

  describe('cancelReservation', () => {
    it('should cancel reservation and trigger waitlist promotion', async () => {
      const mockReservation = {
        id: '1',
        guestName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        date: new Date('2025-12-15'),
        time: '19:00',
        partySize: 4,
        status: ReservationStatus.CANCELLED,
        source: ReservationSource.WEB,
        notes: null,
        cancelToken: 'token1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.reservation.update.mockResolvedValue(mockReservation);

      const mockWaitlistService = WaitlistService as jest.MockedClass<typeof WaitlistService>;
      mockWaitlistService.prototype.tryPromoteNext = jest.fn().mockResolvedValue({
        promoted: false,
      });

      const result = await service.cancelReservation('1');

      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(mockWaitlistService.prototype.tryPromoteNext).toHaveBeenCalled();
    });
  });
});
