import { prisma } from '@/server/db';

export async function checkDatabaseHealth(): Promise<boolean> {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
