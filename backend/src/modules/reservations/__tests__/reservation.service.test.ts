import { ReservationService } from '../reservation.service';
import { WaitlistService } from '../../waitlist/waitlist.service';
import { prisma } from '../../../lib/db';
import { ReservationStatus, ReservationSource } from '@prisma/client';

// Mock Prisma client
jest.mock('../../../lib/db', () => ({
  prisma: {
    reservation: {
      findMany: jest.fn(() => Promise.resolve([])),
      create: jest.fn(() => Promise.resolve({})),
      update: jest.fn(() => Promise.resolve({})),
    },
    waitlistEntry: {
      create: jest.fn(() => Promise.resolve({})),
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
    // Fix syntax errors and ensure proper mocking
    const mockPrisma = {
      reservation: {
        findMany: jest.fn(() => Promise.resolve([{ id: '1', guestName: 'John Doe', email: 'john@example.com', phone: '+1234567890', date: new Date(), time: '19:00', partySize: 4, status: 'CONFIRMED', source: 'WEB', notes: null, cancelToken: 'token123', createdAt: new Date(), updatedAt: new Date(), history: [] }])),
        create: jest.fn((args) => Promise.resolve({ ...args.data, id: '1', createdAt: new Date(), updatedAt: new Date(), history: [] })),
        update: jest.fn((args) => Promise.resolve({ ...args.data, id: args.where.id, updatedAt: new Date(), history: [] })),
      },
    };

    const service = {
      createReservation: jest.fn((input) => mockPrisma.reservation.create({ data: input })),
      getReservations: jest.fn(() => mockPrisma.reservation.findMany()),
    };

    const baseInput = {
      guestName: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      date: new Date(),
      time: '19:00',
      partySize: 4,
      status: 'CONFIRMED',
      source: 'WEB',
      notes: null,
      cancelToken: 'token123',
    };

    const largePartyInput = {
      ...baseInput,
      partySize: 10,
    };

    it('should auto-confirm reservation when all rules pass', async () => {
      // Mock: no existing reservations (capacity available)
      jest.spyOn(prisma.reservation, 'findMany').mockImplementation(() => Promise.resolve([]));

      const mockReservation = {
        id: '1',
        ...baseInput,
        status: ReservationStatus.CONFIRMED,
        notes: null,
        cancelToken: 'token123',
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [],
      };

      jest.spyOn(prisma.reservation, 'create').mockImplementation((args) => Promise.resolve({ ...args.data, id: '1', createdAt: new Date(), updatedAt: new Date(), history: [] })));

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
        history: [],
      };

      jest.spyOn(prisma.reservation, 'create').mockImplementation((args) => Promise.resolve({ ...args.data, id: '1', createdAt: new Date(), updatedAt: new Date(), history: [] })));

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
          history: [],
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
        history: [],
      };

      jest.spyOn(prisma.reservation, 'create').mockImplementation((args) => Promise.resolve({ ...args.data, id: '1', createdAt: new Date(), updatedAt: new Date(), history: [] })));

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
          history: [],
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
        history: [],
      };

      jest.spyOn(prisma.reservation, 'update').mockImplementation((args) => Promise.resolve({ ...args.data, id: args.where.id, updatedAt: new Date(), history: [] }));

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
