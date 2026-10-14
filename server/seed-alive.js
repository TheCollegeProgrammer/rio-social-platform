require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { loadJson, rng, ago } = require("./seed-alive-utils");
const { seedSocial } = require("./seed-alive-social");
const { seedChats } = require("./seed-alive-chats");
const User = require("./models/User");
const Post = require("./models/post");
const Comment = require("./models/Comment");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");

async function seedUsersAndPosts() {
    const { users } = loadJson("users2.json");
    const rand = rng(20261014);
    const hash = await bcrypt.hash("pass1234", 10);
    let newUsers = 0;
    let newPosts = 0;

    for (const u of users) {
        let doc = await User.findOne({ username: u.username });
        if (!doc) {
            doc = await User.create({
                username: u.username,
                email: u.email,
                name: u.name,
                age: u.age,
                bio: u.bio,
                password: hash
            });
            newUsers++;
        }

        const existing = await Post.find({ author: doc._id }, { content: 1 }).lean();
        const seen = new Set(existing.map((x) => x.content.slice(0, 50)));

        for (const p of u.posts) {
            const key = p.content.slice(0, 50);
            if (seen.has(key)) continue;
            seen.add(key);
            const post = await Post.create({
                content: p.content,
                author: doc._id,
                hashtags: p.hashtags,
                image: null
            });
            const created = ago(p.daysAgo, Math.floor(rand() * 720) + 240);
            await Post.collection.updateOne({ _id: post._id }, { $set: { createdAt: created, updatedAt: created } });
            newPosts++;
        }
    }

    console.log(`users: +${newUsers} new, posts: +${newPosts} new (text-only)`);
}

(async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("seed-alive: connected");

    await seedUsersAndPosts();
    await seedSocial({ User, Post, Comment });
    await seedChats({ User, Conversation, Message });

    const [u, p, c, m, cv] = await Promise.all([
        User.countDocuments(), Post.countDocuments(),
        Comment.countDocuments(), Message.countDocuments(), Conversation.countDocuments()
    ]);
    console.log(`FINAL -> users:${u} posts:${p} comments:${c} messages:${m} conversations:${cv}`);
    await mongoose.disconnect();
})().catch((e) => {
    console.error("seed-alive failed:", e);
    process.exit(1);
});
