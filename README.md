# Restaurant Reservation System MVP

A monorepo containing a restaurant reservation system with backend API and web frontend.

## Project Structure

- `/backend` - Node.js + TypeScript + Express + PostgreSQL + Prisma
- `/frontend-web` - React + Vite guest-facing reservation UI

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install all dependencies
npm install

# Set up backend environment
cd backend
cp .env.example .env
# Edit .env with your database credentials

# Run Prisma migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### Development

```bash
# Run both backend and frontend
npm run dev

# Or run individually
npm run dev:backend
npm run dev:frontend
```

### Testing

```bash
npm test
```

## Features

- Guest-facing reservation form
- Automatic reservation confirmation based on capacity
- Waitlist management with automatic promotion
- Email notifications (placeholder)
- Cancellation via unique token

## API Endpoints

See `/backend/README.md` for API documentation.
