# Backend API

Node.js + TypeScript + Express + PostgreSQL backend for the restaurant reservation system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run Prisma migrations:
```bash
npm run prisma:migrate
```

4. (Optional) Seed the database:
```bash
npm run prisma:seed
```

## Development

```bash
npm run dev
```

The server will start on http://localhost:3001

## API Endpoints

### Reservations

- `POST /api/reservations` - Create a new reservation
  ```json
  {
    "guestName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "date": "2025-12-15",
    "time": "19:00",
    "partySize": 4,
    "notes": "Window seat preferred",
    "source": "WEB"
  }
  ```

- `GET /api/reservations?date=2025-12-15&status=CONFIRMED` - Get reservations
- `GET /api/reservations/:id` - Get reservation by ID
- `PATCH /api/reservations/:id` - Update reservation
- `POST /api/reservations/:id/cancel` - Cancel reservation (internal)
- `GET /reservations/cancel/:cancelToken` - Cancel via token (guest-facing)

### Waitlist

- `POST /api/waitlist` - Create waitlist entry
- `GET /api/waitlist?date=2025-12-15&status=WAITING` - Get waitlist entries
- `GET /api/waitlist/:id` - Get waitlist entry by ID
- `PATCH /api/waitlist/:id` - Update waitlist entry

## Business Rules

Configured via environment variables:

- `MAX_AUTO_CONFIRM_PARTY_SIZE` - Max party size for auto-confirmation (default: 8)
- `MAX_COVERS_PER_TIME_SLOT` - Max total guests per time slot (default: 50)
- `MIN_NOTICE_MINUTES` - Minimum advance notice required (default: 60)
- `OPENING_TIME` - Restaurant opening time (default: 11:00)
- `CLOSING_TIME` - Restaurant closing time (default: 22:00)

## Testing

```bash
npm test
```

## Deployment (Railway)

1) Push this repo to GitHub.

2) In Railway:
- New Project → Provision PostgreSQL
- New Service → Deploy from GitHub → set root to `/backend`

3) Service settings:
- Build Command: `npm install && npm run prisma:generate && npm run build`
- Start Command: `npm run start:prod`

4) Variables (Service → Variables):
- `DATABASE_URL` = Use the value from the Railway Postgres plugin
- `NODE_ENV=production`
- `PORT=3001` (Railway will inject its own, but we respect `PORT` env)
- `MAX_AUTO_CONFIRM_PARTY_SIZE=8`
- `MAX_COVERS_PER_TIME_SLOT=50`
- `MIN_NOTICE_MINUTES=60`
- `OPENING_TIME=11:00`
- `CLOSING_TIME=22:00`
- Optional email envs (`FROM_EMAIL`, etc.)

5) After first deploy, migrations will run automatically via `start:prod`.

6) Verify:
- Health: `GET https://<your-service>.up.railway.app/health`
- Docs: `GET https://<your-service>.up.railway.app/docs`
- OpenAPI JSON: `GET https://<your-service>.up.railway.app/openapi.json`

## Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# Create a migration
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate
```
