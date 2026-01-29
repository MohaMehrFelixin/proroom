import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Password@123';

const USERS = [
  { username: 'alice', displayName: 'Alice Johnson', role: 'ADMIN' as const },
  { username: 'bob', displayName: 'Bob Smith', role: 'MEMBER' as const },
  { username: 'charlie', displayName: 'Charlie Brown', role: 'MEMBER' as const },
  { username: 'diana', displayName: 'Diana Prince', role: 'MEMBER' as const },
  { username: 'eve', displayName: 'Eve Williams', role: 'MEMBER' as const },
];

async function main() {
  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

  // Create users
  const users: Record<string, { id: string; username: string }> = {};

  for (const userData of USERS) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        username: userData.username,
        displayName: userData.displayName,
        passwordHash,
        role: userData.role,
      },
    });
    users[userData.username] = user;
    console.log(`User created: ${user.username} (${user.id})`);
  }

  // Also create admin user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: 'Administrator',
      passwordHash: await argon2.hash(process.env.ADMIN_PASSWORD ?? 'Admin@123456'),
      role: 'ADMIN',
    },
  });
  console.log(`Admin user created: ${admin.username} (${admin.id})`);

  // Create DM rooms
  const dmAliceBob = await prisma.room.create({
    data: {
      name: 'Bob Smith',
      type: 'DM',
      createdBy: users.alice.id,
      members: {
        create: [
          { userId: users.alice.id, role: 'MEMBER' },
          { userId: users.bob.id, role: 'MEMBER' },
        ],
      },
    },
  });
  console.log(`DM created: alice <-> bob (${dmAliceBob.id})`);

  const dmAliceCharlie = await prisma.room.create({
    data: {
      name: 'Charlie Brown',
      type: 'DM',
      createdBy: users.alice.id,
      members: {
        create: [
          { userId: users.alice.id, role: 'MEMBER' },
          { userId: users.charlie.id, role: 'MEMBER' },
        ],
      },
    },
  });
  console.log(`DM created: alice <-> charlie (${dmAliceCharlie.id})`);

  // Create group rooms
  const engineering = await prisma.room.create({
    data: {
      name: 'Engineering Team',
      type: 'GROUP',
      createdBy: users.alice.id,
      members: {
        create: [
          { userId: users.alice.id, role: 'ADMIN' },
          { userId: users.bob.id, role: 'MEMBER' },
          { userId: users.charlie.id, role: 'MEMBER' },
        ],
      },
    },
  });
  console.log(`Group created: Engineering Team (${engineering.id})`);

  const design = await prisma.room.create({
    data: {
      name: 'Design Team',
      type: 'GROUP',
      createdBy: users.alice.id,
      members: {
        create: [
          { userId: users.alice.id, role: 'ADMIN' },
          { userId: users.diana.id, role: 'MEMBER' },
          { userId: users.eve.id, role: 'MEMBER' },
        ],
      },
    },
  });
  console.log(`Group created: Design Team (${design.id})`);

  console.log('\n--- Seed Complete ---');
  console.log(`All test users password: ${DEFAULT_PASSWORD}`);
  console.log('Users: alice, bob, charlie, diana, eve');
  console.log('DMs: alice<->bob, alice<->charlie');
  console.log('Groups: Engineering Team, Design Team');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
