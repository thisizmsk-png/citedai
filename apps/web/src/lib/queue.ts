import { Queue } from "bullmq";
import { QUEUE_NAMES } from "@citedai/shared";
import type { CrawlJobData } from "@citedai/shared";

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : "localhost",
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || "6379") : 6379,
  password: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).password : undefined,
};

/**
 * Crawl job queue. Used by API routes to enqueue scan jobs.
 */
export const crawlQueue = new Queue<CrawlJobData>(QUEUE_NAMES.CRAWL, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});
