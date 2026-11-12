const MediaCleanup = require("../models/MediaCleanup");
const AuditLog = require("../models/AuditLog");
const { destroyRemoteAsync } = require("../config/cloudinary");

const MAX_ATTEMPTS = 10;
const backoffMs = (attempts) => Math.min(attempts * 30000, 30 * 60 * 1000);

let timer = null;
let running = false;

const processQueue = async () => {
    if (running) return;
    running = true;
    try {
        const jobs = await MediaCleanup.find({
            nextAttemptAt: { $lte: new Date() },
            exhausted: { $ne: true }
        }).limit(10);
        for (const job of jobs) {
            try {
                await destroyRemoteAsync(job.url);
                await job.deleteOne();
            } catch (error) {
                job.attempts += 1;
                job.lastError = String(error.message || error).slice(0, 300);
                if (job.attempts >= MAX_ATTEMPTS) {
                    // 7.10: keep the failed job as an audit record instead of
                    // dropping it; reconcile-media.js --retry-destroy requeues.
                    job.exhausted = true;
                    await job.save();
                    console.warn(`[media-cleanup] giving up on ${job.url}: ${job.lastError}`);
                    AuditLog.create({
                        action: "media.destroy_exhausted",
                        targetType: "media",
                        meta: { url: job.url, attempts: job.attempts, lastError: job.lastError }
                    }).catch(() => {});
                } else {
                    job.nextAttemptAt = new Date(Date.now() + backoffMs(job.attempts));
                    await job.save();
                }
            }
        }
    } catch (error) {
        // DB unavailable (startup/shutdown) - the next tick retries; never crash.
    } finally {
        running = false;
    }
};

const schedule = () => {
    if (timer) return;
    timer = setInterval(processQueue, 60 * 1000);
    if (timer.unref) timer.unref();
};

// Idempotent: the unique url index collapses duplicate enqueues.
const enqueueDestroy = async (url) => {
    if (!url) return;
    try {
        await MediaCleanup.updateOne(
            { url },
            {
                $setOnInsert: { attempts: 0, nextAttemptAt: new Date(), lastError: "" }
            },
            { upsert: true }
        );
        schedule();
        void processQueue();
    } catch (error) {
        // queue not reachable - nothing durable we can do from here
    }
};

module.exports = { enqueueDestroy, processQueue };
