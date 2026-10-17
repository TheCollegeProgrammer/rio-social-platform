require("dotenv").config();
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { enabled, uploadBuffer } = require("./config/cloudinary");
const User = require("./models/User");
const Post = require("./models/post");

const UPLOADS = path.join(__dirname, "uploads");
const deleteLocal = process.argv.includes("--delete-local");

if (!enabled) {
    console.error("Cloudinary not configured - check CLOUDINARY_* vars in .env");
    process.exit(1);
}

const isLocal = (url) => typeof url === "string" && url.startsWith("/uploads/");
const localPath = (url) => path.join(UPLOADS, url.replace("/uploads/", ""));

const migrateOne = async (oldUrl, folder) => {
    const fp = localPath(oldUrl);
    if (!fs.existsSync(fp)) return { status: "missing" };
    const result = await uploadBuffer(fs.readFileSync(fp), folder);
    if (deleteLocal) fs.unlinkSync(fp);
    return { status: "ok", url: result.secure_url };
};

const migrateUsers = async () => {
    const stats = { migrated: 0, missing: 0, failed: 0 };
    const users = await User.find({ $or: [{ avatar: /^\/uploads\// }, { coverImage: /^\/uploads\// }] });
    for (const u of users) {
        try {
            if (isLocal(u.avatar)) {
                const r = await migrateOne(u.avatar, "avatars");
                if (r.status === "ok") { u.avatar = r.url; stats.migrated++; }
                else if (r.status === "missing") stats.missing++;
            }
            if (isLocal(u.coverImage)) {
                const r = await migrateOne(u.coverImage, "covers");
                if (r.status === "ok") { u.coverImage = r.url; stats.migrated++; }
                else if (r.status === "missing") stats.missing++;
            }
            await u.save();
            console.log(`user @${u.username} done`);
        } catch (e) {
            stats.failed++;
            console.error(`user @${u.username} FAILED: ${e.message}`);
        }
    }
    return stats;
};

const migratePosts = async () => {
    const stats = { migrated: 0, missing: 0, failed: 0 };
    const posts = await Post.find({ $or: [{ image: /^\/uploads\// }, { images: /^\/uploads\// }] });
    for (const p of posts) {
        try {
            let changed = false;
            if (isLocal(p.image)) {
                const r = await migrateOne(p.image, "posts");
                if (r.status === "ok") {
                    const old = p.image;
                    p.image = r.url;
                    if (!p.images.length) p.images = [r.url];
                    else p.images = p.images.map((img) => (img === old ? r.url : img));
                    changed = true;
                    stats.migrated++;
                } else if (r.status === "missing") stats.missing++;
            }
            const arr = p.images || [];
            if (arr.some(isLocal)) {
                const next = [];
                for (const img of arr) {
                    if (!isLocal(img)) { next.push(img); continue; }
                    const r = await migrateOne(img, "posts");
                    if (r.status === "ok") { next.push(r.url); stats.migrated++; changed = true; }
                    else { next.push(img); if (r.status === "missing") stats.missing++; }
                }
                p.images = next;
                if (!p.image && next.length) p.image = next[0];
            }
            if (changed) await p.save();
        } catch (e) {
            stats.failed++;
            console.error(`post ${p._id} FAILED: ${e.message}`);
        }
    }
    return stats;
};

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("connected, migrating...");
    const users = await migrateUsers();
    const posts = await migratePosts();
    console.log("\n=== SUMMARY ===");
    console.log(`users: ${users.migrated} migrated, ${users.missing} missing, ${users.failed} failed`);
    console.log(`posts: ${posts.migrated} migrated, ${posts.missing} missing, ${posts.failed} failed`);
    await mongoose.disconnect();
    console.log("DONE");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
