import { Heart, MessageCircle, Reply, UserPlus, X, Check, AtSign } from "lucide-react";

// Shared presentation data for the notifications feed (5.8 + 6.4 types).
export const ICONS = {
    like: Heart,
    comment: MessageCircle,
    reply: Reply,
    follow: UserPlus,
    follow_request: UserPlus,
    follow_approved: Check,
    follow_rejected: X,
    mention: AtSign
};

export const PROFILE_LINK_TYPES = [
    "follow", "follow_request", "follow_approved", "follow_rejected"
];

export function timeAgo(date) {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export function notificationText(n) {
    const name = n.sender?.name || "Someone";
    switch (n.type) {
        case "like": return `${name} liked your post`;
        case "comment": return `${name} commented: "${n.comment?.content?.slice(0, 60)}"`;
        case "reply": return `${name} replied: "${n.comment?.content?.slice(0, 60)}"`;
        case "follow": return `${name} started following you`;
        case "follow_request": return `${name} requested to follow you`;
        case "follow_approved": return `${name} approved your follow request`;
        case "follow_rejected": return `${name} declined your follow request`;
        case "mention": return `${name} mentioned you${n.comment ? " in a comment" : ""}`;
        default: return `${n.type} notification`;
    }
}
