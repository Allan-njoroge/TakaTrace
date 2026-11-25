import { buildApp } from "./app.js";
import { initChain } from "./chain/provider.js";
import { initDemoSigner } from "./chain/demoSigner.js";
import { config } from "./config.js";
import { initDb, prisma } from "./db.js";
import { startJobs, stopJobs } from "./jobs/scheduler.js";
import { closeAllSseClients } from "./lib/events.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  await initDb();
  await initChain();
  initDemoSigner();

  if (config.DEMO_MODE) {
    logger.warn("DEMO_MODE is enabled: /api/demo/* and the phone simulator are active. Never enable this in production.");
  }

  const app = buildApp();
  const server = app.listen(config.PORT, () => {
    logger.info(`TakaTrace server listening on http://localhost:${config.PORT}`);
  });

  startJobs();

  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    stopJobs();
    closeAllSseClients();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
