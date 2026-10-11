require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const PROF = require("./seed-content");
const User = require("./models/User");
const Post = require("./models/post");

// pravatar exposes img 1-70; spread 10 users across the range
const avatarUrl = (i) => `https://i.pravatar.cc/400?img=${[3, 11, 16, 24, 31, 42, 47, 53, 60, 68][i]}`;

// Deterministic picsum covers (stable /id/ endpoint, never reshuffles)
const coverUrl = (i) => `https://picsum.photos/id/${[10, 20, 30, 40, 50, 60, 70, 80, 90, 100][i]}/800/300`;

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Wipe previous seed users and ALL posts (post seeding removed for now)
    const usernames = PROF.map((p) => p.username);
    const oldUsers = await User.find({ username: { $in: usernames } }).select("_id");
    const oldIds = oldUsers.map((u) => u._id);
    if (oldIds.length) {
        await Post.deleteMany({ author: { $in: oldIds } });
        await User.deleteMany({ _id: { $in: oldIds } });
        console.log(`Removed ${oldIds.length} previous seed users`);
    }
    const removedPosts = await Post.deleteMany({});
    console.log(`Removed ${removedPosts.deletedCount} posts`);

    const hash = await bcrypt.hash("pass1234", 10);
    const users = [];

    for (let i = 0; i < PROF.length; i++) {
        const prof = PROF[i];
        const user = await User.create({
            username: prof.username,
            name: prof.name,
            age: prof.age,
            email: `${prof.username}@demo.com`,
            password: hash,
            bio: `${prof.role} | ${prof.bio}`,
            avatar: avatarUrl(i),
            coverImage: coverUrl(i)
        });
        users.push(user);
        console.log(`+ ${prof.username} (${prof.role})`);
    }

    // Follow graph so profiles/follow features have data
    const pool = users.map((u) => u._id);
    for (let i = 0; i < pool.length; i++) {
        const targets = [pool[(i + 1) % pool.length], pool[(i + 3) % pool.length], pool[(i + 7) % pool.length]];
        await User.updateOne({ _id: pool[i] }, { $addToSet: { following: { $each: targets } } });
        await User.updateMany({ _id: { $in: targets } }, { $addToSet: { followers: pool[i] } });
    }
    console.log("+ follow graph");

    console.log(`\nDone. ${users.length} users, 0 posts`);
    console.log("Login: <username>@demo.com / pass1234");
    await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
