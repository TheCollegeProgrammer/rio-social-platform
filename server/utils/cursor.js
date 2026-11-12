const { Types } = require("mongoose");

// Opaque feed cursor: base64url of "<createdAtMillis>|<postId>".
// Stable newest-first paging with _id as the tie-breaker; survives new
// inserts and deletions between pages (unlike skip/limit).

const encodeCursor = (post) =>
    Buffer.from(`${new Date(post.createdAt).getTime()}|${post._id}`, "utf8").toString("base64url");

const decodeCursor = (raw) => {
    if (!raw || typeof raw !== "string") return null;
    try {
        const text = Buffer.from(raw, "base64url").toString("utf8");
        const [ts, id] = text.split("|");
        const time = Number(ts);
        if (!Number.isFinite(time) || !Types.ObjectId.isValid(id)) return null;
        return { at: new Date(time), id: new Types.ObjectId(id) };
    } catch {
        return null;
    }
};

const cursorFilter = (cursor) => ({
    $or: [
        { createdAt: { $lt: cursor.at } },
        { createdAt: cursor.at, _id: { $lt: cursor.id } }
    ]
});

module.exports = { encodeCursor, decodeCursor, cursorFilter };
