import { runIndexerTick } from "../chain/indexer.js";
import { checkChainReset } from "../chain/reset.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { logger } from "../lib/logger.js";
import { dispatchPendingPayouts, markStaleSentAsUnknown } from "../modules/payouts/service.js";
import { verifyAnchorWatcherCandidates } from "../modules/receipts/anchorWatcher.js";
import { retryDueSms } from "../providers/sms/service.js";
import { runIntegrityScan } from "../modules/admin/service.js";

interface Job {
  name: string;
  intervalMs: number;
  run: () => Promise<unknown>;
}

const JOBS: Job[] = [
  { name: "indexer", intervalMs: config.INDEXER_POLL_MS, run: runIndexerTick },
  { name: "reset-check", intervalMs: 10_000, run: checkChainReset },
  { name: "anchor-watcher", intervalMs: 15_000, run: verifyAnchorWatcherCandidates },
  { name: "sms-retry", intervalMs: 30_000, run: retryDueSms },
  { name: "payout-dispatcher", intervalMs: 5_000, run: dispatchPendingPayouts },
  { name: "payout-watcher", intervalMs: 60_000, run: markStaleSentAsUnknown },
  { name: "integrity-scan", intervalMs: 6 * 3_600_000, run: runIntegrityScan },
  { name: "cleanup", intervalMs: 3_600_000, run: cleanupTick },
];

const timers: NodeJS.Timeout[] = [];
const running = new Set<string>();

export function startJobs(): void {
  for (const job of JOBS) {
    const timer = setInterval(() => {
      if (running.has(job.name)) return; // never overlap a job with itself
      running.add(job.name);
      job
        .run()
        .catch((err) => logger.error({ err, job: job.name }, "job failed"))
        .finally(() => running.delete(job.name));
    }, job.intervalMs);
    timers.push(timer);
  }
  logger.info({ jobs: JOBS.map((j) => j.name) }, "background jobs started");
}

export function stopJobs(): void {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
}

async function cleanupTick(): Promise<void> {
  const now = new Date();
  await prisma.authNonce.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.ussdSession.updateMany({ where: { endedAt: null, startedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }, data: { endedAt: now } });
}
