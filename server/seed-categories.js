require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { loadJson, rng, ago, pickDistinct } = require("./seed-alive-utils");
const { extractHashtags } = require("./controllers/post.controller");
const User = require("./models/User");
const Post = require("./models/post");
const Comment = require("./models/Comment");

const DIR = path.join(__dirname, "uploads", "categories");
const PALETTES = {
    motivation: ["#7c2d12", "#f97316", "#fdba74"],
    "billionaire-mindset": ["#451a03", "#eab308", "#fef08a"],
    f1: ["#450a0a", "#ef4444", "#fca5a5"],
    motorsport: ["#0c4a6e", "#38bdf8", "#bae6fd"]
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const wrap = (text, max) => {
    const lines = [];
    let cur = "";
    for (const w of text.split(" ")) {
        if ((cur + " " + w).trim().length > max) { lines.push(cur.trim()); cur = w; }
        else cur = (cur + " " + w).trim();
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 5);
};

const svgSlide = (slug, text, idx, total) => {
    const [dark, accent, light] = PALETTES[slug];
    const lines = wrap(text, 26);
    const y = 560 - ((lines.length - 1) * 100) / 2;
    const spans = lines.map((l, i) => `<tspan x="90"${i ? ' dy="100"' : ""}>${esc(l)}</tspan>`).join("");
    const label = `${slug.replace("-", " ").toUpperCase()} · ${idx + 1}/${total}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <circle cx="920" cy="170" r="250" fill="${light}" opacity="0.14"/>
  <circle cx="130" cy="970" r="170" fill="${dark}" opacity="0.35"/>
  <rect x="90" y="148" width="110" height="8" rx="4" fill="${light}"/>
  <text x="90" y="232" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="${light}" opacity="0.9">${esc(label)}</text>
  <text y="${y}" font-family="Arial, sans-serif" font-size="86" font-weight="bold" fill="#ffffff">${spans}</text>
  <text x="90" y="1010" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="${light}" opacity="0.85">RIO</text>
</svg>`;
};

const seedCategories = async () => {
    const { categories } = loadJson("categories.json");
    const users = await User.find({}, { _id: 1, username: 1 }).lean();
    const byName = new Map(users.map((u) => [u.username, u._id]));
    const rand = rng(20261015);
    const existing = await Post.find({ category: { $ne: null } }, { content: 1, author: 1 }).lean();
    const seen = new Set(existing.map((x) => `${x.author}|${x.content.slice(0, 40)}`));
    fs.mkdirSync(DIR, { recursive: true });
    const stat = { posts: 0, likes: 0, comments: 0, images: 0 };

    for (const cat of categories) {
        let f = 0;
        for (const p of cat.posts) {
            const author = byName.get(p.author);
            if (!author) { console.log("  skip unknown author:", p.author); continue; }
            const images = p.slides.map((t, i) => {
                const name = `${cat.slug}-${f++}.svg`;
                fs.writeFileSync(path.join(DIR, name), svgSlide(cat.slug, t, i, p.slides.length));
                stat.images++;
                return `/uploads/categories/${name}`;
            });
            const key = `${author}|${p.content.slice(0, 40)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const post = await Post.create({
                content: p.content,
                author,
                category: cat.slug,
                hashtags: extractHashtags(p.content),
                images,
                image: images[0] || null
            });
            const created = ago(p.daysAgo, Math.floor(rand() * 720) + 120);
            await Post.collection.updateOne({ _id: post._id }, { $set: { createdAt: created, updatedAt: created } });
            const likers = pickDistinct(rand, users, p.likes, author);
            post.likes = likers.map((u) => u._id);
            await post.save();
            stat.likes += likers.length;
            for (const c of p.comments) {
                const cAuthor = byName.get(c.by);
                if (!cAuthor) continue;
                const doc = await Comment.create({ content: c.text, author: cAuthor, post: post._id });
                await Comment.collection.updateOne({ _id: doc._id }, { $set: { createdAt: created } });
                stat.comments++;
            }
            stat.posts++;
        }
    }
    console.log(`categories: +${stat.posts} posts, +${stat.likes} likes, +${stat.comments} comments, ${stat.images} svg files`);
};

(async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("seed-categories: connected");
    await seedCategories();
    const [u, p, c] = await Promise.all([
        User.countDocuments(), Post.countDocuments(), Comment.countDocuments()
    ]);
    console.log(`FINAL -> users:${u} posts:${p} comments:${c}`);
    await mongoose.disconnect();
})().catch((e) => {
    console.error("seed-categories failed:", e);
    process.exit(1);
});
