# Reservation API Endpoints

Base URL (Production): `https://reservation-app-production.up.railway.app`
Base URL (Local): `http://localhost:3002`

---

## CREATE - Create New Reservation
**Endpoint:** `POST /api/reservations`

**Request Body:**
```json
{
  "guestName": "John Doe",
  "email": "john@example.com",
  "phone": "15551234567",           // Accepts any format, auto-formats to +1 (XXX) XXX-XXXX
  "date": "2025-12-25",              // YYYY-MM-DD format
  "time": "18:30",                   // HH:mm format (24-hour)
  "partySize": 4,                    // Integer, 1-20
  "notes": "Window seat preferred",  // Optional
  "source": "WEB"                    // WEB, IN_HOUSE, or PHONE
}
```

**Response:**
```json
{
  "status": "confirmed",
  "reservation": {
    "id": "clx123abc...",
    "guestName": "John Doe",
    "email": "john@example.com",
    "phone": "+1 (555) 123-4567",
    "date": "2025-12-25T00:00:00.000Z",
    "time": "18:30",
    "partySize": 4,
    "status": "CONFIRMED",
    "source": "WEB",
    "notes": "Window seat preferred",
    "cancelToken": "abc123...",
    "createdAt": "2025-12-09T...",
    "updatedAt": "2025-12-09T..."
  },
  "message": "Reservation confirmed!"
}
```

---

## READ - Get All Reservations
**Endpoint:** `GET /api/reservations`

**Query Parameters (Optional):**
- `date` - Filter by date (YYYY-MM-DD format)
- `status` - Filter by status (PENDING, CONFIRMED, or CANCELLED)

**Example:**
```
GET /api/reservations?date=2025-12-25&status=CONFIRMED
```

**Response:**
```json
{
  "reservations": [
    {
      "id": "clx123abc...",
      "guestName": "John Doe",
      "email": "john@example.com",
      "phone": "+1 (555) 123-4567",
      "date": "2025-12-25T00:00:00.000Z",
      "time": "18:30",
      "partySize": 4,
      "status": "CONFIRMED",
      "source": "WEB",
      "notes": "Window seat preferred",
      "cancelToken": "abc123...",
      "createdAt": "2025-12-09T...",
      "updatedAt": "2025-12-09T..."
    }
  ]
}
```

---

## READ - Get Single Reservation by ID
**Endpoint:** `GET /api/reservations/:id`

**Example:**
```
GET /api/reservations/clx123abc...
```

**Response:**
```json
{
  "reservation": {
    "id": "clx123abc...",
    "guestName": "John Doe",
    "email": "john@example.com",
    "phone": "+1 (555) 123-4567",
    "date": "2025-12-25T00:00:00.000Z",
    "time": "18:30",
    "partySize": 4,
    "status": "CONFIRMED",
    "source": "WEB",
    "notes": "Window seat preferred",
    "cancelToken": "abc123...",
    "createdAt": "2025-12-09T...",
    "updatedAt": "2025-12-09T..."
  }
}
```

---

## UPDATE - Update Reservation
**Endpoint:** `PATCH /api/reservations/:id`

**Request Body (All fields optional - send only what you want to update):**
```json
{
  "guestName": "Jane Doe",           // Optional
  "email": "jane@example.com",       // Optional
  "phone": "15559998888",            // Optional - auto-formats
  "date": "2025-12-26",              // Optional - YYYY-MM-DD
  "time": "19:00",                   // Optional - HH:mm
  "partySize": 6,                    // Optional - 1-20
  "status": "CONFIRMED",             // Optional - PENDING, CONFIRMED, CANCELLED
  "notes": "Updated notes"           // Optional
}
```

**Example:**
```
PATCH /api/reservations/clx123abc...
```

**Response:**
```json
{
  "reservation": {
    "id": "clx123abc...",
    "guestName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 (555) 999-8888",
    "date": "2025-12-26T00:00:00.000Z",
    "time": "19:00",
    "partySize": 6,
    "status": "CONFIRMED",
    "source": "WEB",
    "notes": "Updated notes",
    "cancelToken": "abc123...",
    "createdAt": "2025-12-09T...",
    "updatedAt": "2025-12-09T..."
  }
}
```

---

## DELETE - Delete Reservation
**Endpoint:** `DELETE /api/reservations/:id`

**Example:**
```
DELETE /api/reservations/clx123abc...
```

**Response:**
```json
{
  "message": "Reservation deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Reservation not found"
}
```

---

## Additional Endpoints

### Cancel Reservation (Internal)
**Endpoint:** `POST /api/reservations/:id/cancel`

Changes status to CANCELLED without deleting the record.

**Response:**
```json
{
  "reservation": { ... },
  "message": "Reservation cancelled successfully"
}
```

### Cancel Reservation (Guest Token)
**Endpoint:** `GET /reservations/cancel/:cancelToken`

Guest-facing cancellation using the token from confirmation email.

**Response:**
```json
{
  "reservation": { ... },
  "message": "Your reservation has been cancelled successfully"
}
```

---

## Validation Rules

- **guestName**: Required (min 1 character)
- **email**: Required, valid email format
- **phone**: Required, US phone number (11 digits starting with 1), auto-formatted to `+1 (XXX) XXX-XXXX`
- **date**: Required, `YYYY-MM-DD` format
- **time**: Required, `HH:mm` format (24-hour), seconds optional
- **partySize**: Required, integer between 1-20
- **status**: `PENDING`, `CONFIRMED`, or `CANCELLED`
- **source**: `WEB`, `IN_HOUSE`, or `PHONE`
- **notes**: Optional string

---

## Error Responses

**400 - Validation Error:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": ["phone"],
      "message": "Phone must be a US number: +1 (XXX) XXX-XXXX"
    }
  ]
}
```

**404 - Not Found:**
```json
{
  "error": "Reservation not found"
}
```

**500 - Server Error:**
```json
{
  "error": "Internal server error"
}
```
