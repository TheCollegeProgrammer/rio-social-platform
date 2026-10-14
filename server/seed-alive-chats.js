const { loadJson, rng, ago } = require("./seed-alive-utils");

async function seedChats({ User, Conversation, Message }) {
    const { chats } = loadJson("engagement.json");
    const existing = await Conversation.find({}, { participants: 1 }).lean();
    const seen = new Set(
        existing.map((c) => c.participants.map(String).sort().join("|"))
    );
    const rand = rng(4242);
    let created = 0;
    let total = 0;

    for (const chat of chats) {
        const a = await User.findOne({ username: chat.a });
        const b = await User.findOne({ username: chat.b });
        if (!a || !b) {
            console.log(`chats: skip ${chat.a}<->${chat.b} (user missing)`);
            continue;
        }

        const key = [a._id, b._id].map(String).sort().join("|");
        if (seen.has(key)) continue;

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
        seen.add(key);
        created++;
        total += docs.length;
    }

    console.log(`chats: +${created} conversations, +${total} messages`);
}

module.exports = { seedChats };
