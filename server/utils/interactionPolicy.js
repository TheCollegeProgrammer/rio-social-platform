const User = require("../models/User");

// 6.10: shared interaction-audience policy. Every endpoint that lets one
// user reach another (comment, mention, message) runs the target's
// setting through here so the rules cannot drift apart.
const AUDIENCES = ["everyone", "followers"];

const MESSAGES = {
    comment: "Only followers can comment on this post",
    mention: "Only followers can mention this user",
    message: "Only followers can message this user"
};

// Settings PUT validation: undefined/null means "leave unchanged".
const parseAudience = (value) => {
    if (value === undefined || value === null || value === "") return { ok: true, value: null };
    if (AUDIENCES.includes(value)) return { ok: true, value };
    return { ok: false };
};

const AUDIENCE_FIELDS = ["commentAudience", "mentionAudience", "messageAudience"];

// Request body -> { updates, errors } for the privacy settings endpoint.
const parseAudiences = (body) => {
    const updates = {};
    const errors = [];
    for (const field of AUDIENCE_FIELDS) {
        const value = body[field];
        if (value === undefined) continue;
        const parsed = parseAudience(value);
        if (!parsed.ok) errors.push(`${field} must be everyone or followers`);
        else if (parsed.value !== null) updates[field] = parsed.value;
    }
    return { updates, errors };
};

// Returns null when the interaction is allowed, otherwise the 403 message.
// The actor is always allowed to interact with themselves.
const audienceError = async (targetId, viewerId, kind) => {
    const field = `${kind}Audience`;
    const target = await User.findById(targetId).select(field);
    if (!target || target[field] !== "followers") return null;
    if (viewerId && String(viewerId) === String(targetId)) return null;
    const viewer = await User.findById(viewerId).select("following");
    const follows = (viewer?.following || []).some((f) => String(f) === String(targetId));
    return follows ? null : MESSAGES[kind];
};

module.exports = { parseAudiences, audienceError };
