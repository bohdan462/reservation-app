import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample tables
  const tables = await Promise.all([
    prisma.table.create({
      data: {
        name: 'Table 1',
        capacityMin: 2,
        capacityMax: 4,
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        name: 'Table 2',
        capacityMin: 2,
        capacityMax: 4,
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        name: 'Table 3',
        capacityMin: 4,
        capacityMax: 6,
        isActive: true,
      },
    }),
    prisma.table.create({
      data: {
        name: 'Table 4',
        capacityMin: 6,
        capacityMax: 8,
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${tables.length} tables`);

  // Create a sample reservation
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const reservation = await prisma.reservation.create({
    data: {
      guestName: 'Sample Guest',
      email: 'sample@example.com',
      phone: '+1234567890',
      date: tomorrow,
      time: '19:00',
      partySize: 4,
      status: 'CONFIRMED',
      source: 'WEB',
      notes: 'Sample reservation for testing',
    },
  });

  console.log('Created sample reservation:', reservation.id);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
