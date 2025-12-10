# Email Setup Guide

## Option 1: Gmail (Recommended for Testing)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Under "Signing in to Google", enable "2-Step Verification"

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter "Reservation App" as the name
4. Click "Generate"
5. Copy the 16-character password (no spaces)

### Step 3: Update Your `.env` File
Edit `backend/.env` and add:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tech.bohdan@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=tech.bohdan@gmail.com
```

### Step 4: Restart Backend
```bash
# Stop the backend (Ctrl+C in terminal)
cd backend
npm run dev
```

### Step 5: Test
Create a reservation and check your inbox at tech.bohdan@gmail.com!

---

## Option 2: Mailtrap (Development Testing)

For testing without sending real emails:

1. Sign up at https://mailtrap.io (free)
2. Get SMTP credentials from your inbox
3. Update `.env`:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
FROM_EMAIL=reservations@restaurant.com
```

All emails will be caught by Mailtrap instead of being sent to real addresses.

---

## Option 3: SendGrid (Production)

1. Sign up at https://sendgrid.com
2. Create an API key
3. Update `.env`:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

---

## Testing Email Sending

Once configured, test with:

```bash
# Create a reservation
curl -X POST http://localhost:3002/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "Bohdan Test",
    "email": "tech.bohdan@gmail.com",
    "phone": "+1 (555) 123-4567",
    "date": "2025-12-20",
    "time": "19:00",
    "partySize": 4,
    "source": "WEB"
  }'
```

Check your email inbox for:
- Subject: "Reservation Confirmed"
- Manage link included

---

## Troubleshooting

### Gmail "Less secure app access"
- Google now requires App Passwords (not regular password)
- Make sure 2FA is enabled first

### "Authentication failed"
- Double-check your app password (no spaces)
- Verify SMTP_USER is your full Gmail address

### "Connection timeout"
- Check your firewall settings
- Try port 465 with `SMTP_PORT=465`

### No errors but no email received
- Check spam folder
- Verify the recipient email is correct
- Check backend console for "[EMAIL] ✅ Email sent successfully"
