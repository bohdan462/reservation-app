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

function normalizeApiBase(raw?: string): string {
  const val = (raw || '').trim();
  if (!val) return 'http://localhost:3002';
  // Already absolute
  if (/^https?:\/\//i.test(val)) return val;
  // If starts with //, assume https
  if (/^\/\//.test(val)) return `https:${val}`;
  // If starts with /, make it origin-relative
  if (/^\//.test(val)) return `${window.location.origin}${val}`;
  // Otherwise, treat as hostname and default to https
  return `https://${val}`;
}

const API_BASE_URL = normalizeApiBase(
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env.VITE_API_BASE
    : undefined
);

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

  // Read raw text first to avoid JSON.parse errors
  const rawText = await response.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch (e) {
    console.error('API parse error:', e);
    console.error('Raw response text:', rawText);
  }

  if (!response.ok) {
    const error = parsed || { error: 'HTTP error', status: response.status, body: rawText };
    console.error('API Error:', error);
    
    // Handle validation errors with details
    if (error.details && Array.isArray(error.details)) {
      const messages = error.details.map((d: any) => d.message || d.path?.join('.') || '').join(', ');
      throw new Error(messages || error.error || 'Validation failed');
    }
    
    throw new Error(error.error || `Failed to create reservation (status ${response.status})`);
  }

  if (!parsed) {
    console.warn('API returned empty/invalid JSON, using fallback');
    // Fallback: attempt to parse known success shape from text or throw
    throw new Error('Unexpected API response format');
  }
  return parsed as CreateReservationResponse;
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
