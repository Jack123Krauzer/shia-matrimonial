import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createHash } from 'node:crypto';
import { PrismaClient, Prisma } from "../generated/prisma/client";
import { databaseConfig } from './database-config.mjs';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaDatabaseKey?: string };
const config = databaseConfig();
const schemaKey = JSON.stringify(Object.entries(Prisma).filter(([name]) => name === 'ModelName' || name.endsWith('ScalarFieldEnum')));
const databaseKey = createHash('sha256').update(config.url + '\0' + (config.authToken || '') + '\0' + schemaKey).digest('hex');

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: config.url, authToken: config.authToken });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prismaDatabaseKey === databaseKey && globalForPrisma.prisma
  ? globalForPrisma.prisma : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseKey = databaseKey;
}
