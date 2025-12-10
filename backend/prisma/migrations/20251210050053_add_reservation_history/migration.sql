-- CreateEnum
CREATE TYPE "ReservationChangeType" AS ENUM ('CREATED', 'UPDATED', 'CANCELLED', 'CONFIRMED', 'SEATED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ChangeActor" AS ENUM ('GUEST', 'STAFF', 'SYSTEM');

-- CreateTable
CREATE TABLE "ReservationHistory" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "changeType" "ReservationChangeType" NOT NULL,
    "actor" "ChangeActor" NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationHistory_reservationId_idx" ON "ReservationHistory"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationHistory_createdAt_idx" ON "ReservationHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "ReservationHistory" ADD CONSTRAINT "ReservationHistory_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
