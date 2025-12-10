# Guest Manage Reservation Flow - Testing Guide

## How It Works

### 1. Guest Makes Reservation
- Guest visits: `http://localhost:5173/`
- Fills out reservation form
- Submits → Backend creates reservation with unique `cancelToken`
- Guest receives email with manage link

### 2. Email Content
```
Subject: Reservation Confirmed

Dear John,

Your reservation has been confirmed!

Date: 2025-12-15
Time: 19:00
Party Size: 4

Manage your reservation (edit or cancel):
http://localhost:5173/manage/abc-123-xyz-token

Thank you for choosing our restaurant!
```

### 3. Guest Clicks Manage Link
- Link opens: `http://localhost:5173/manage/abc-123-xyz-token`
- Frontend calls: `GET /api/public/reservations/:token`
- Shows reservation details with:
  - Current status badge (PENDING/CONFIRMED/CANCELLED/SEATED/NO_SHOW)
  - Guest info (name, email, phone)
  - Reservation details (date, time, party size, notes)
  - "Edit Reservation" button
  - "Cancel Reservation" button

### 4. Guest Can Edit
- Click "Edit Reservation"
- Update: date, time, party size, or notes
- Submit → Frontend calls: `PATCH /api/public/reservations/:token`
- Backend:
  - Updates reservation
  - Sets status to PENDING (for staff review)
  - Sends "Reservation Updated" email
- Success message shown

### 5. Guest Can Cancel
- Click "Cancel Reservation"
- Confirm dialog appears
- Confirm → Frontend calls: `POST /api/public/reservations/:token/cancel`
- Backend:
  - Sets status to CANCELLED
  - Sends "Reservation Cancelled" email
- Redirects to home after 2 seconds

## API Endpoints Used

### Public Routes (No Authentication)
- `GET /api/public/reservations/:token` - View reservation
- `PATCH /api/public/reservations/:token` - Update reservation
- `POST /api/public/reservations/:token/cancel` - Cancel reservation

## Testing Locally

1. Start backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start frontend:
   ```bash
   cd frontend-web
   npm run dev
   ```

3. Create a test reservation:
   - Visit `http://localhost:5173/`
   - Fill out form and submit
   - Check backend console for email logs (shows the manage URL)

4. Copy the token from console log:
   ```
   [EMAIL] Body: ...
   Manage your reservation: http://localhost:5173/manage/COPY-THIS-TOKEN
   ```

5. Test manage page:
   - Visit: `http://localhost:5173/manage/COPY-THIS-TOKEN`
   - Try editing the reservation
   - Try canceling it

## Production Flow

In production (Railway deployment):
- Emails sent via real SMTP server
- Guest receives actual emails
- Links use production domain: `https://your-app.railway.app/manage/:token`
- Everything works the same way!

## Features Implemented

✅ View reservation by token
✅ Edit reservation (date, time, party size, notes)
✅ Cancel reservation
✅ Status badges (PENDING, CONFIRMED, CANCELLED, SEATED, NO_SHOW)
✅ Automatic email notifications on update/cancel
✅ Mobile-responsive design
✅ Error handling
✅ Loading states
✅ Confirmation dialogs
