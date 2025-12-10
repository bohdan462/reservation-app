import { ReservationService } from '../reservation.service';
import { WaitlistService } from '../../waitlist/waitlist.service';
import { prisma } from '../../../lib/db';
import { ReservationStatus, ReservationSource } from '@prisma/client';

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
      const existingReservations = await prisma.reservation.findMany({
        where: {
          date: baseInput.date,
          time: baseInput.time,
        },
      });

      const mockReservation = {
        id: '1',
        ...baseInput,
        status: ReservationStatus.CONFIRMED,
        notes: null,
        cancelToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.createReservation(baseInput);

      expect(result.status).toBe('confirmed');
      expect(result.reservation?.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.reservation).toEqual(expect.objectContaining(mockReservation));
    });

    it('should set status to PENDING for large party size', async () => {
      const largePartyInput = {
        ...baseInput,
        partySize: 15, // exceeds maxAutoConfirmPartySize (8)
      };

      // Mock: no existing reservations (capacity available)
      const existingReservations = await prisma.reservation.findMany({
        where: {
          date: largePartyInput.date,
          time: largePartyInput.time,
        },
      });

      const mockReservation = {
        id: '1',
        ...largePartyInput,
        status: ReservationStatus.PENDING,
        notes: null,
        cancelToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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

      // Mock: no existing reservations (capacity available)
      const existingReservations = await prisma.reservation.findMany({
        where: {
          date: earlyInput.date,
          time: earlyInput.time,
        },
      });

      const mockReservation = {
        id: '1',
        ...earlyInput,
        status: ReservationStatus.PENDING,
        notes: null,
        cancelToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.createReservation(earlyInput);

      expect(result.status).toBe('pending');
    });

    it('should create a reservation with real database', async () => {
      const input = {
        guestName: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        date: new Date('2025-12-15'),
        time: '19:00',
        partySize: 4,
        source: ReservationSource.WEB,
      };

      const result = await service.createReservation(input);

      expect(result.status).toBe('confirmed');
      expect(result.reservation).toMatchObject({
        guestName: input.guestName,
        email: input.email,
        phone: input.phone,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        source: input.source,
      });
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

      const result = await service.getReservations({ date });

      expect(result).toEqual(mockReservations);
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
