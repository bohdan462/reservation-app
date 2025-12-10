-- CreateTable
CREATE TABLE "RestaurantSettings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL DEFAULT 'default',
    "restaurantName" TEXT NOT NULL DEFAULT 'My Restaurant',
    "diningRoomSeats" INTEGER NOT NULL DEFAULT 50,
    "barSeats" INTEGER NOT NULL DEFAULT 12,
    "outdoorSeats" INTEGER NOT NULL DEFAULT 20,
    "maxReservationsPerSlot" INTEGER NOT NULL DEFAULT 8,
    "turnoverMinutes" INTEGER NOT NULL DEFAULT 90,
    "autoAcceptMaxPartySize" INTEGER NOT NULL DEFAULT 6,
    "requireDepositMinPartySize" INTEGER NOT NULL DEFAULT 8,
    "maxDaysInAdvance" INTEGER NOT NULL DEFAULT 60,
    "minHoursInAdvance" INTEGER NOT NULL DEFAULT 2,
    "autoWaitlistThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "autoPendingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "largePartyNeedsApproval" BOOLEAN NOT NULL DEFAULT true,
    "largePartyMinSize" INTEGER NOT NULL DEFAULT 10,
    "allowSameDayBooking" BOOLEAN NOT NULL DEFAULT true,
    "sameDayCutoffHour" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingHours" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,

    CONSTRAINT "OperatingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePeriod" (
    "id" TEXT NOT NULL,
    "operatingHoursId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "ServicePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDate" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "customOpenTime" TEXT,
    "customCloseTime" TEXT,
    "customAutoAcceptMax" INTEGER,
    "customRequireDepositMin" INTEGER,
    "customWaitlistThreshold" DOUBLE PRECISION,
    "customPendingThreshold" DOUBLE PRECISION,

    CONSTRAINT "SpecialDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantSettings_restaurantId_key" ON "RestaurantSettings"("restaurantId");

-- CreateIndex
CREATE INDEX "OperatingHours_restaurantId_idx" ON "OperatingHours"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingHours_restaurantId_dayOfWeek_key" ON "OperatingHours"("restaurantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ServicePeriod_operatingHoursId_idx" ON "ServicePeriod"("operatingHoursId");

-- CreateIndex
CREATE INDEX "SpecialDate_restaurantId_idx" ON "SpecialDate"("restaurantId");

-- CreateIndex
CREATE INDEX "SpecialDate_date_idx" ON "SpecialDate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialDate_restaurantId_date_key" ON "SpecialDate"("restaurantId", "date");

-- AddForeignKey
ALTER TABLE "OperatingHours" ADD CONSTRAINT "OperatingHours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "RestaurantSettings"("restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePeriod" ADD CONSTRAINT "ServicePeriod_operatingHoursId_fkey" FOREIGN KEY ("operatingHoursId") REFERENCES "OperatingHours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDate" ADD CONSTRAINT "SpecialDate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "RestaurantSettings"("restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;
