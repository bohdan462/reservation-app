import { z } from 'zod';

export const createReservationSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:mm format'),
  partySize: z.number().int().min(1).max(20),
  notes: z.string().optional(),
  source: z.enum(['WEB', 'IN_HOUSE', 'PHONE']).default('WEB'),
});

export const updateReservationSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

export const getReservationsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
});
