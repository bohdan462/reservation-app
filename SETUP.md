# Quick Start Guide

This guide will help you set up and run the restaurant reservation system.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git (optional)

## Installation Steps

### 1. Install Dependencies

From the root directory:

```bash
npm install
```

This will install dependencies for both the backend and frontend.

### 2. Set Up the Database

Create a PostgreSQL database:

```bash
# Using psql
psql -U postgres
CREATE DATABASE restaurant_reservations;
\q
```

### 3. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and update the DATABASE_URL:

```
DATABASE_URL="postgresql://username:password@localhost:5432/restaurant_reservations?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

### 4. Run Database Migrations

```bash
# From the backend directory
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# (Optional) Seed with sample data
npm run prisma:seed
```

### 5. Start the Development Servers

From the root directory:

```bash
# Start both backend and frontend
npm run dev
```

Or start them individually:

```bash
# Backend only (in one terminal)
npm run dev:backend

# Frontend only (in another terminal)
npm run dev:frontend
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## Testing the System

### Test the Backend API

```bash
# Create a reservation
curl -X POST http://localhost:3001/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "guestName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "date": "2025-12-20",
    "time": "19:00",
    "partySize": 4,
    "source": "WEB"
  }'

# Get reservations for a date
curl "http://localhost:3001/api/reservations?date=2025-12-20"
```

### Test the Frontend

1. Open http://localhost:5173
2. Fill out the reservation form
3. Submit and see the confirmation

### Run Backend Tests

```bash
cd backend
npm test
```

## Database Management

### Open Prisma Studio

```bash
cd backend
npm run prisma:studio
```

This opens a visual database browser at http://localhost:5555

### Create a New Migration

```bash
cd backend
npm run prisma:migrate
```

## Project Structure

```
restaurant-reservations/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Sample data
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── lib/               # Database & email utilities
│   │   ├── modules/
│   │   │   ├── reservations/  # Reservation module
│   │   │   └── waitlist/      # Waitlist module
│   │   ├── app.ts             # Express app
│   │   └── server.ts          # Server entry point
│   └── package.json
├── frontend-web/
│   ├── src/
│   │   ├── api/               # API client
│   │   ├── components/        # React components
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── package.json               # Root package.json
```

## Business Rules Configuration

Edit `backend/.env` to customize:

- `MAX_AUTO_CONFIRM_PARTY_SIZE=8` - Max party size for auto-confirmation
- `MAX_COVERS_PER_TIME_SLOT=50` - Max total guests per time slot
- `MIN_NOTICE_MINUTES=60` - Minimum advance notice required
- `OPENING_TIME=11:00` - Restaurant opening time
- `CLOSING_TIME=22:00` - Restaurant closing time

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `backend/.env`
- Ensure the database exists

### Port Already in Use

- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend-web/vite.config.ts`

### Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules backend/node_modules frontend-web/node_modules
npm install
```

### Prisma Client Issues

```bash
cd backend
npm run prisma:generate
```

## Next Steps

1. **Email Integration**: Configure SMTP settings in `backend/.env` to enable email notifications
2. **Production Deployment**: Build for production with `npm run build`
3. **WordPress Integration**: See `frontend-web/README.md` for embedding instructions
4. **Extend Functionality**: Add more features like table management, analytics, etc.

## Support

For issues or questions:
1. Check the README files in each directory
2. Review the code comments
3. Check the test files for usage examples

Happy coding! 🎉
