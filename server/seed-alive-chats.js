const { loadJson, rng, ago } = require("./seed-alive-utils");

async function seedChats({ User, Conversation, Message }) {
    if ((await Conversation.countDocuments()) > 0) {
        console.log("chats: already seeded, skipping");
        return;
    }

    const { chats } = loadJson("engagement.json");
    const rand = rng(4242);
    let total = 0;

    for (const chat of chats) {
        const a = await User.findOne({ username: chat.a });
        const b = await User.findOne({ username: chat.b });
        if (!a || !b) {
            console.log(`chats: skip ${chat.a}<->${chat.b} (user missing)`);
            continue;
        }

        const start = ago(chat.daysAgo, Math.floor(rand() * 720) + 60);
        const readable = chat.messages
            .map((m, i) => ({ m, i }))
            .filter(({ m }) => m.from !== chat.unreadBy);
        const unreadIdx = new Set(
            (chat.unreadBy === "none" ? [] : readable.slice(-2)).map(({ i }) => i)
        );

        const docs = chat.messages.map((m, i) => {
            const sender = m.from === "a" ? a : b;
            const other = m.from === "a" ? b : a;
            const readBy = [sender._id];
            if (!unreadIdx.has(i)) readBy.push(other._id);
            return {
                sender: sender._id,
                content: m.text,
                readBy,
                createdAt: new Date(start.getTime() + m.t * 60000),
                updatedAt: new Date(start.getTime() + m.t * 60000)
            };
        });

        const last = docs[docs.length - 1];
        const unreadForA = chat.unreadBy === "a" ? unreadIdx.size : 0;
        const unreadForB = chat.unreadBy === "b" ? unreadIdx.size : 0;

        const convo = await Conversation.create({
            participants: [a._id, b._id],
            lastMessage: { content: last.content, sender: last.sender, createdAt: last.createdAt },
            unreadCounts: { [a._id.toString()]: unreadForA, [b._id.toString()]: unreadForB }
        });

        await Message.insertMany(docs.map((d) => ({ ...d, conversation: convo._id })));
        await Conversation.collection.updateOne(
            { _id: convo._id },
            { $set: { createdAt: start, updatedAt: last.createdAt } }
        );
        total += docs.length;
    }

    console.log(`chats: ${chats.length} conversations, ${total} messages`);
}

module.exports = { seedChats };
