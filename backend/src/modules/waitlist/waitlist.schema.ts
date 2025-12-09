import { z } from 'zod';

export const createWaitlistSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  partySize: z.number().int().min(1).max(20),
});

export const updateWaitlistSchema = z.object({
  status: z.enum(['WAITING', 'PROMOTED', 'EXPIRED']).optional(),
  linkedReservationId: z.string().optional(),
});

export const getWaitlistQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['WAITING', 'PROMOTED', 'EXPIRED']).optional(),
});
