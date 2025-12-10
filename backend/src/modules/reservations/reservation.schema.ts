import { z } from 'zod';

export const createReservationSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required'),
  email: z.string().email('Valid email is required'),
  // Accept any input, strip non-digits, require US 11 digits starting with 1
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .refine((digits) => /^1\d{10}$/.test(digits), {
      message: 'Phone must be a US number: +1 (XXX) XXX-XXXX',
    }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Time must be in HH:mm or HH:mm:ss format'),
  partySize: z.number().int().min(1).max(20),
  notes: z.string().optional(),
  source: z.enum(['WEB', 'IN_HOUSE', 'PHONE']).default('WEB'),
});

export const updateReservationSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .refine((digits) => /^1\d{10}$/.test(digits), {
      message: 'Phone must be a US number: +1 (XXX) XXX-XXXX',
    })
    .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Time must be in HH:mm or HH:mm:ss format').optional(),
  partySize: z.number().int().min(1).max(20).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'SEATED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
});

export const getReservationsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'SEATED', 'NO_SHOW']).optional(),
});
