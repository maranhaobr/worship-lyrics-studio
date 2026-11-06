import { PrismaClient } from '../generated/client';
const globalForPrisma = globalThis as unknown as { wlsPrisma?: PrismaClient };
export const prisma = globalForPrisma.wlsPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.wlsPrisma = prisma;
export * from '../generated/client';
