require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { enabled, cloudinary, isRemote, publicIdFromUrl } = require("./config/cloudinary");
const { enqueueDestroy, processQueue } = require("./utils/mediaQueue");
const User = require("./models/User");
const Post = require("./models/post");
const Draft = require("./models/Draft");
const MediaCleanup = require("./models/MediaCleanup");
const AuditLog = require("./models/AuditLog");

// 7.10: reconcile stored media against DB references (Post/User/Draft image
// fields). Dry-run by default; --delete removes ONLY assets that are both
// unreferenced AND older than the grace window (--grace-hours=N, default
// 24h) so in-flight uploads and live media are never deleted. Remote
// deletions go through the durable MediaCleanup queue (retryable with
// backoff); --retry-destroy requeues exhausted jobs for a fresh cycle.
// Local subdirectories (seeded category art) are static assets: never touched.

const UPLOADS = path.join(__dirname, "uploads");
const args = process.argv.slice(2);
const apply = args.includes("--delete");
const retry = args.includes("--retry-destroy");
const graceArg = args.find((a) => a.startsWith("--grace-hours="));
const graceHours = graceArg ? Number(graceArg.split("=")[1]) || 24 : 24;

const referenced = async () => {
    const [p1, p2, u1, u2, d1] = await Promise.all([
        Post.distinct("image"),
        Post.distinct("images"),
        User.distinct("avatar"),
        User.distinct("coverImage"),
        Draft.distinct("images")
    ]);
    return [...p1, ...p2, ...u1, ...u2, ...d1].filter(Boolean);
};

const listLocal = () =>
    fs.existsSync(UPLOADS)
        ? fs.readdirSync(UPLOADS, { withFileTypes: true })
              .filter((e) => e.isFile())
              .map((e) => e.name)
        : [];

const listRemote = async () => {
    if (!enabled) return null;
    const out = [];
    let cursor;
    do {
        const r = await cloudinary.api.resources({
            type: "upload",
            resource_type: "image",
            prefix: "rio/",
            max_results: 500,
            next_cursor: cursor
        });
        out.push(...r.resources);
        cursor = r.next_cursor;
    } while (cursor && out.length < 20000);
    return out;
};

const run = async () => {
    if (apply && process.env.NODE_ENV === "test") throw new Error("--delete refused in test env");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    const refs = await referenced();
    const now = Date.now();
    const graceMs = graceHours * 3600 * 1000;

    const refNames = new Set(refs.filter((v) => !isRemote(v)).map((v) => path.basename(v)));
    const localNames = listLocal();
    const orphanNames = localNames.filter((n) => !refNames.has(n));
    // Only media extensions are delete candidates: seed metadata, logs and
    // anything unrecognized in the uploads root are report-only.
    const MEDIA_EXT = /\.(jpe?g|png|gif|webp|avif|mp4|webm|mov|ico|svg)$/i;
    const orphanMedia = orphanNames.filter((n) => MEDIA_EXT.test(n));
    const wouldDelete = orphanMedia.filter(
        (n) => now - fs.statSync(path.join(UPLOADS, n)).mtimeMs >= graceMs
    );
    const nonMedia = orphanNames.length - orphanMedia.length;
    const danglingRefs = [...refNames].filter((n) => !localNames.includes(n)).length;

    const resources = await listRemote();
    const refIds = new Set(refs.filter(isRemote).map(publicIdFromUrl).filter(Boolean));
    const remoteWould = resources
        ? resources.filter(
              (r) =>
                  !r.public_id.startsWith("rio/categories") &&
                  !refIds.has(r.public_id) &&
                  now - new Date(r.created_at).getTime() >= graceMs
          )
        : [];

    let requeued = 0;
    if (retry) {
        const res = await MediaCleanup.updateMany(
            { exhausted: true },
            { $set: { exhausted: false, attempts: 0, nextAttemptAt: new Date() } }
        );
        requeued = res.modifiedCount;
    }

    if (apply) {
        for (const n of wouldDelete) fs.unlinkSync(path.join(UPLOADS, n));
        for (const r of remoteWould) enqueueDestroy(r.secure_url);
        if (remoteWould.length) await processQueue();
    } else if (resources) {
        for (const r of remoteWould) console.log(`remote-orphan ${r.secure_url}`);
    }

    const summary = {
        mode: apply ? "delete" : "dry-run",
        graceHours,
        local: {
            scanned: localNames.length,
            orphans: orphanNames,
            wouldDelete,
            nonMedia,
            deleted: apply ? wouldDelete.length : 0,
            danglingRefs
        },
        remote: resources
            ? { scanned: resources.length, wouldDelete: remoteWould.length, deleted: apply ? remoteWould.length : 0 }
            : { scanned: 0, skipped: "cloudinary-disabled" },
        requeued
    };
    try {
        await AuditLog.create({ action: "media.reconcile", targetType: "media", meta: summary });
    } catch (error) {
        console.error(`[reconcile] audit write failed: ${error.message}`);
    }
    console.log(`RECONCILE ${JSON.stringify(summary)}`);
    await mongoose.disconnect();
};

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
