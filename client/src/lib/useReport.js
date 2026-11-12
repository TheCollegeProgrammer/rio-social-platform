import { useState } from "react";
import { createReport } from "../services/moderationApi";

// 6.7: prompt-based report flow shared by post/comment/profile surfaces.
// Returns null on cancel, otherwise { ok, message } for toast/error display.
export function useReport(targetType) {
    const [busy, setBusy] = useState(false);
    const report = async (targetId, label) => {
        const reason = window.prompt(`Why are you reporting this ${label}?`);
        if (reason === null) return null;
        if (!reason.trim()) return { ok: false, message: "A reason is required" };
        setBusy(true);
        try {
            await createReport(targetType, targetId, reason.trim());
            return { ok: true, message: "Report submitted" };
        } catch (err) {
            return { ok: false, message: err.message };
        } finally {
            setBusy(false);
        }
    };
    return { busy, report };
}
