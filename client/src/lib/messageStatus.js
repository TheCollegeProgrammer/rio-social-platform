// 5.6: precise state transitions for the sender's own bubbles —
// sent (persisted) -> delivered (recipient's client acked) -> read
// (recipient opened the conversation). Socket emission alone never
// advances the state; only persisted readBy/deliveredTo do.
export function messageStatus(message, peerId) {
    if (!peerId) return "";
    const has = (list) => (list || []).some((x) => String(x?._id || x) === String(peerId));
    if (has(message.readBy)) return "Read";
    if (has(message.deliveredTo)) return "Delivered";
    return "Sent";
}
