import "dotenv/config";
import { Worker } from "bullmq";
import { QUEUE_NAMES, CRAWL_SETTINGS } from "@citedai/shared";
import type { CrawlJobData, CrawlJobProgress } from "@citedai/shared";
import { processCrawlJob } from "./crawl-handler.js";

// ---------------------------------------------------------------------------
// Redis connection
// ---------------------------------------------------------------------------

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : "localhost",
  port: process.env.REDIS_URL
    ? parseInt(new URL(process.env.REDIS_URL).port || "6379")
    : 6379,
  password: process.env.REDIS_URL
    ? new URL(process.env.REDIS_URL).password
    : undefined,
};

// ---------------------------------------------------------------------------
// Crawl worker
// ---------------------------------------------------------------------------

const crawlWorker = new Worker<CrawlJobData, void>(
  QUEUE_NAMES.CRAWL,
  async (job) => {
    console.log(
      `[crawl] Starting job ${job.id} — site=${job.data.siteId}, scan=${job.data.scanId}`,
    );

    await processCrawlJob(job.data, async (progress: CrawlJobProgress) => {
      await job.updateProgress(progress);
    });

    console.log(`[crawl] Completed job ${job.id}`);
  },
  {
    connection,
    concurrency: CRAWL_SETTINGS.MAX_CONCURRENT_REQUESTS,
    limiter: {
      max: 10,
      duration: 60_000, // max 10 jobs per minute
    },
  },
);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  console.log(`[worker] Received ${signal}, shutting down gracefully...`);
  await crawlWorker.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

crawlWorker.on("error", (err) => {
  console.error("[crawl] Worker error:", err);
});

crawlWorker.on("failed", (job, err) => {
  console.error(`[crawl] Job ${job?.id} failed:`, err.message);
});

console.log("[worker] CitedAI crawl worker started. Waiting for jobs...");
