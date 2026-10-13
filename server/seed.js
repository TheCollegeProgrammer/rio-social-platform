require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const PROF = require("./seed-content");
const User = require("./models/User");
const Post = require("./models/post");
const Comment = require("./models/Comment");
const Notification = require("./models/Notification");

const UPLOADS = path.join(__dirname, "uploads");
const HOUR = 3600000;

const loadManifest = () => {
    try { return JSON.parse(fs.readFileSync(path.join(UPLOADS, "seed-manifest.json"), "utf8")); } catch { return {}; }
};
const mediaPath = (manifest, key) => (manifest[key] ? `/uploads/${manifest[key].file}` : "");
const extractHashtags = (text) => text.match(/#\w+/g) || [];
const buildBio = (p) => `${p.profession} | ${p.bio} | ${p.profile_hashtags.join(" ")}`.slice(0, 200);
const ageFor = (id) => 21 + ((id * 3) % 14);

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    const manifest = loadManifest();
    if (!Object.keys(manifest).length) {
        console.log("NOTE: no seed-manifest.json found - run `node fetch-seed-images.js` first (posts will have no images)");
    }

    const demoIds = (await User.find({ email: /@demo\.com$/ }).select("_id")).map((u) => u._id);
    const postIds = (await Post.find({}).select("_id")).map((p) => p._id);
    await Promise.all([
        Comment.deleteMany({ post: { $in: postIds } }),
        Notification.deleteMany({ $or: [{ post: { $in: postIds } }, { recipient: { $in: demoIds } }] }),
        User.updateMany({}, { $pull: { bookmarks: { $in: postIds }, followers: { $in: demoIds }, following: { $in: demoIds } } }),
        Post.deleteMany({}),
        User.deleteMany({ _id: { $in: demoIds } })
    ]);
    console.log(`Wiped ${demoIds.length} demo users, ${postIds.length} posts`);

    const hash = await bcrypt.hash("pass1234", 10);
    const users = await User.insertMany(PROF.map((p, i) => ({
        username: p.username,
        name: p.name,
        age: ageFor(p.id),
        email: `${p.username}@demo.com`,
        password: hash,
        bio: buildBio(p),
        avatar: mediaPath(manifest, `${p.username}_avatar`),
        coverImage: `https://picsum.photos/id/${10 + i * 10}/800/300`
    })));
    console.log(`+ ${users.length} users`);

    const pool = users.map((u) => u._id);
    for (let i = 0; i < pool.length; i++) {
        const targets = [pool[(i + 1) % pool.length], pool[(i + 3) % pool.length], pool[(i + 7) % pool.length]];
        await User.updateOne({ _id: pool[i] }, { $addToSet: { following: { $each: targets } } });
        await User.updateMany({ _id: { $in: targets } }, { $addToSet: { followers: pool[i] } });
    }
    console.log("+ follow graph");

    // heading + caption + hashtags in content; staggered ~6h apart over the last 30 days
    const now = Date.now();
    const total = PROF.length * 8;
    const docs = [];
    PROF.forEach((p, u) => {
        p.posts.forEach((post, pi) => {
            const content = `${post.heading}\n\n${post.caption}\n${post.hashtags.join(" ")}`;
            const createdAt = new Date(now - (total - 1 - (pi * PROF.length + u)) * 6 * HOUR);
            docs.push({
                content,
                author: pool[u],
                hashtags: extractHashtags(content),
                image: mediaPath(manifest, `${p.username}_p${post.post_no}`),
                createdAt,
                updatedAt: createdAt
            });
        });
    });
    const created = await Post.insertMany(docs);
    // force staggered dates regardless of mongoose timestamp behavior
    await Post.collection.bulkWrite(created.map((doc, i) => ({
        updateOne: { filter: { _id: doc._id }, update: { $set: { createdAt: docs[i].createdAt, updatedAt: docs[i].createdAt } } }
    })));
    console.log(`+ ${created.length} posts`);

    const withImages = created.filter((p) => p.image).length;
    console.log(`\nDone. ${users.length} users, ${created.length} posts (${withImages} with images)`);
    console.log("Login: <username>@demo.com / pass1234");
    await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
