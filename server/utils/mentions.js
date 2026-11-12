const User = require("../models/User");
const { createNotification } = require("../controllers/notification.controller");
const { audienceError } = require("./interactionPolicy");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 6.6: unique @usernames found in content, without the "@".
const extractMentionNames = (content) => {
    const matches = (content || "").match(/@(\w+)/g);
    return matches ? [...new Set(matches.map((m) => m.slice(1)))] : [];
};

// Resolve names to user ids (case-insensitive; unknown names drop out).
const resolveMentions = async (content) => {
    const names = extractMentionNames(content);
    if (!names.length) return [];
    const pattern = `^(${names.map(escapeRegex).join("|")})$`;
    const users = await User.find({ username: { $regex: pattern, $options: "i" } }).select("_id");
    return users.map((u) => u._id);
};

// 6.6: deliver mention notifications. Duplicate suppression (edits that
// re-mention the same person) lives in createNotification; the target's
// mention audience setting gates delivery here.
const notifyMentions = async (ids, sender, { post, comment } = {}) => {
    for (const id of ids || []) {
        if (String(id) === String(sender)) continue;
        if (await audienceError(id, sender, "mention")) continue;
        await createNotification({
            recipient: id,
            sender,
            type: "mention",
            ...(post ? { post } : {}),
            ...(comment ? { comment } : {})
        });
    }
};

module.exports = { extractMentionNames, resolveMentions, notifyMentions };
