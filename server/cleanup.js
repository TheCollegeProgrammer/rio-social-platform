require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/post");
const Notification = require("./models/Notification");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const Comment = require("./models/Comment");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    const junk = await User.find({ email: { $not: /@demo\.com$/ } }).select("_id username");
    const ids = junk.map((u) => u._id);
    if (!ids.length) {
        console.log("No test data to clean.");
        await mongoose.disconnect();
        return;
    }

    const posts = await Post.find({ author: { $in: ids } }).select("_id");
    const postIds = posts.map((p) => p._id);

    const [p1, p2, p3, p4, p5, p6, p7] = await Promise.all([
        Post.deleteMany({ _id: { $in: postIds } }),
        Comment.deleteMany({ post: { $in: postIds } }),
        Notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { sender: { $in: ids } }] }),
        Message.deleteMany({ sender: { $in: ids } }),
        Conversation.deleteMany({ participants: { $in: ids } }),
        User.updateMany({ _id: { $nin: ids } }, { $pull: { followers: { $in: ids }, following: { $in: ids }, bookmarks: { $in: postIds } } }),
        User.deleteMany({ _id: { $in: ids } })
    ]);

    console.log(`Deleted ${junk.length} test users, ${p1.deletedCount} posts, ${p2.deletedCount} comments, ${p3.deletedCount} notifications, ${p5.deletedCount} conversations`);
    const total = await Post.countDocuments();
    console.log(`Remaining posts: ${total}`);
    await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
