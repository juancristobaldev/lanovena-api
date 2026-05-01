import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$'];

function isBcryptHash(value: string) {
  return BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

async function run() {
  const targetRoles: Role[] = [Role.LEAGUE_OWNER, Role.PLANNER];

  let rehashed = 0;
  let skipped = 0;

  for (const role of targetRoles) {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true, password: true, email: true },
    });

    for (const user of users) {
      if (!user.password || isBcryptHash(user.password)) {
        skipped += 1;
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      rehashed += 1;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Rehash complete. Updated: ${rehashed}. Skipped: ${skipped}.`);
}

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Rehash failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
