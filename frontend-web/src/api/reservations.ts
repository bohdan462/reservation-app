export interface CreateReservationRequest {
  guestName: string;
  email: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partySize: number;
  notes?: string;
  source?: 'WEB' | 'IN_HOUSE' | 'PHONE';
}

export interface Reservation {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  source: 'WEB' | 'IN_HOUSE' | 'PHONE';
  notes?: string;
  cancelToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistEntry {
  id: string;
  guestName: string;
  email?: string;
  phone?: string;
  date: string;
  time: string;
  partySize: number;
  status: 'WAITING' | 'PROMOTED' | 'EXPIRED';
  linkedReservationId?: string;
  createdAt: string;
  promotedAt?: string;
}

export interface CreateReservationResponse {
  status: 'confirmed' | 'pending' | 'waitlisted';
  reservation?: Reservation;
  waitlistEntry?: WaitlistEntry;
  message: string;
}

const API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE) || 'http://localhost:3002';

export async function createReservation(
  data: CreateReservationRequest
): Promise<CreateReservationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      source: data.source || 'WEB',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create reservation');
  }

  return response.json();
}

export async function cancelReservation(cancelToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/reservations/cancel/${cancelToken}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel reservation');
  }
}
