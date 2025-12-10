import { Reservation } from '@prisma/client';

export function formatDateLocal(date: Date): string {
  // For values coming from the DB with @db.Date Prisma returns a Date at UTC midnight.
  // Use UTC getters so the date value is interpreted as a calendar date, not shifted by server timezone.
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

export function serializeReservation(reservation: Reservation | any) {
  if (!reservation) return reservation;
  const cloned = { ...reservation };
  if (cloned.date instanceof Date) {
    const formatted = formatDateLocal(cloned.date as Date);
    // If createdAt is available, compare; sometimes Date-only fields end up shifted by one day
    // due to timezone conversions. If the createdAt UTC date is exactly one day after the
    // formatted date, prefer createdAt's date as a fallback (fixes common iOS/UTC shift cases).
    if (cloned.createdAt) {
      try {
        const created = new Date(cloned.createdAt);
        const createdDateStr = formatDateLocal(created);
        // compute day difference
        const d1 = new Date(formatted + 'T00:00:00Z');
        const d2 = new Date(createdDateStr + 'T00:00:00Z');
        const dayDiff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          cloned.date = createdDateStr;
        } else {
          cloned.date = formatted;
        }
      } catch (e) {
        cloned.date = formatted;
      }
    } else {
      cloned.date = formatted;
    }
  }
  // If the date is already a string (e.g., serialized earlier), attempt the same fallback logic
  if (typeof cloned.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cloned.date)) {
    const formatted = cloned.date;
    if (cloned.createdAt) {
      try {
        const created = new Date(cloned.createdAt);
        const createdDateStr = formatDateLocal(created);
        const d1 = new Date(formatted + 'T00:00:00Z');
        const d2 = new Date(createdDateStr + 'T00:00:00Z');
        const dayDiff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          cloned.date = createdDateStr;
        } else {
          cloned.date = formatted;
        }
      } catch (e) {
        cloned.date = formatted;
      }
    } else {
      cloned.date = formatted;
    }
  }
  return cloned;
}

export function serializeReservations(reservations: Array<Reservation | any>) {
  return reservations.map(r => serializeReservation(r));
}
