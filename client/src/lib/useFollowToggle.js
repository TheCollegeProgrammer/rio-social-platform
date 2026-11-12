import { useRef } from "react";
import { toggleFollow } from "../services/api";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";

// 4.4 optimistic follow: flip UI state immediately, reconcile with the
// server response, roll back on failure. In-flight ids are deduped so
// repeated clicks can never fire duplicate toggle requests.
export function useFollowToggle() {
    const { setUser } = useAuth();
    const { error: toastError, success: toastSuccess } = useToast();
    const inFlight = useRef(new Set());

    // Keep the auth-context following list in sync (PostAuthor and
    // SuggestionsCard derive their button state from user.following).
    const setInList = (id, add) => {
        setUser((prev) => {
            if (!prev) return prev;
            const list = prev.following || [];
            const has = list.some((f) => (f?._id || f) === id);
            if (add === has) return prev;
            return {
                ...prev,
                following: add
                    ? [...list, id]
                    : list.filter((f) => (f?._id || f) !== id)
            };
        });
    };

    // next = desired following state. optimistic/reconcile/rollback let
    // pages mirror counts locally (e.g. UserProfile followers totals).
    const toggle = async (id, next, { optimistic, reconcile, rollback } = {}) => {
        if (!id || inFlight.current.has(id)) return null;
        inFlight.current.add(id);
        try {
            optimistic?.(next);
            setInList(id, next);
            const d = await toggleFollow(id);
            setInList(id, d.following);
            reconcile?.(d);
            // 6.4: surfaces without their own reconcile (cards, suggestions)
            // still need feedback when the server turned the click into a
            // pending request instead of a follow.
            if (d.pending && !reconcile) toastSuccess("Follow request sent");
            return d;
        } catch (err) {
            rollback?.(next);
            setInList(id, !next);
            toastError(err.message || "Could not update follow");
            return null;
        } finally {
            inFlight.current.delete(id);
        }
    };

    return { toggle };
}
