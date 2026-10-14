const { loadJson, rng, pick, ago, pickDistinct, topicFor } = require("./seed-alive-utils");

const REPLIES = ["So true 😄", "This. Exactly this.", "Couldn't agree more", "Well said 👏", "Haha +1 on that", "Saving this comment.", "100% this", "Underrated take"];

async function seedSocial({ User, Post, Comment }) {
    if ((await Comment.countDocuments()) > 50) {
        console.log("social: already seeded, skipping");
        return;
    }

    const { commentPools, tagMap } = loadJson("engagement.json");
    const users = await User.find({});
    const posts = await Post.find({}).sort({ createdAt: 1 });
    const rand = rng(777);
    const comments = [];
    const likeOps = [];

    for (const post of posts) {
        const topic = topicFor(post, tagMap);
        const pool = commentPools[topic] || commentPools.generic;
        const poolLeft = [...pool];
        const n = 3 + Math.floor(rand() * 5); // 3-7 comments
        const authors = pickDistinct(rand, users, n, post.author);

        // post likes: ~45% of other users, min 3
        const likers = users.filter((u) => !u._id.equals(post.author) && rand() < 0.45);
        while (likers.length < 3) {
            const cand = pick(rand, users.filter((u) => !u._id.equals(post.author)));
            if (!likers.some((l) => l._id.equals(cand._id))) likers.push(cand);
        }
        likeOps.push({ updateOne: { filter: { _id: post._id }, update: { $set: { likes: likers.map((u) => u._id) } } } });

        const daysOld = Math.max(1, Math.round((Date.now() - post.createdAt.getTime()) / 86400000));
        for (let i = 0; i < authors.length; i++) {
            const text = poolLeft.length ? poolLeft.splice(Math.floor(rand() * poolLeft.length), 1)[0] : pick(rand, pool);
            comments.push({
                content: text,
                author: authors[i]._id,
                post: post._id,
                parentComment: null,
                depth: 0,
                likes: likers.filter(() => rand() < 0.2).map((u) => u._id),
                createdAt: ago(daysOld - 1, Math.floor(rand() * 1400) + 30),
                updatedAt: ago(daysOld - 1, Math.floor(rand() * 1400) + 30)
            });
        }

        // ~35% of posts get a reply thread
        if (rand() < 0.35 && authors.length > 1) {
            const replier = pick(rand, users.filter((u) => !u._id.equals(post.author) && !u._id.equals(authors[0]._id)));
            comments.push({
                content: pick(rand, REPLIES),
                author: replier._id,
                post: post._id,
                depth: 1,
                likes: [],
                createdAt: ago(Math.max(0, daysOld - 2), Math.floor(rand() * 700)),
                updatedAt: ago(Math.max(0, daysOld - 2), Math.floor(rand() * 700))
            });
        }
    }

    const inserted = await Comment.insertMany(comments);

    // link depth-1 replies to the first comment of their post
    const firstOfPost = {};
    for (const c of inserted) {
        const key = c.post.toString();
        if (c.depth === 0 && !firstOfPost[key]) firstOfPost[key] = c._id;
    }
    const replyOps = inserted
        .filter((c) => c.depth === 1)
        .map((c) => ({ updateOne: { filter: { _id: c._id }, update: { parentComment: firstOfPost[c.post.toString()] } } }));
    if (replyOps.length) await Comment.bulkWrite(replyOps);

    await Post.bulkWrite(likeOps);
    console.log(`social: ${inserted.length} comments, likes on ${likeOps.length} posts`);
}

module.exports = { seedSocial };
