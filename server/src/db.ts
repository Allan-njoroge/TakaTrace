import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
export const prisma = new PrismaClient({
  adapter,
  // Default 5s is too tight once the indexer, background jobs, and demo/API writes all
  // contend for SQLite's single writer at once; a transaction that has to wait for the
  // lock (bounded by PRAGMA busy_timeout below) must not be killed before it gets it.
  transactionOptions: { timeout: 15_000, maxWait: 10_000 },
});

export async function initDb(): Promise<void> {
  await prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
  // SQLite allows only one writer at a time; under concurrent writes (the indexer,
  // background jobs, and requests all write), the default busy behaviour fails fast
  // instead of waiting. Let a blocked writer wait up to 5s for the lock to clear.
  await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
}
