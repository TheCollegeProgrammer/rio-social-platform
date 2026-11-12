import { useState } from "react";
import { useToast } from "../context/useToast.js";
import { blockUser, unblockUser } from "../services/api";

// 6.1: block/unblock toggle for the profile page. `resetFollow` clears
// follow/request state when a block severs the relationship. The blocked
// profile itself is refused by the server (403), so this hook only ever
// runs for the blocker's own view.
export function useProfileBlock(profile, setProfile, resetFollow) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const toggle = async (id) => {
        const next = !profile.blockedByYou;
        setBusy(true);
        try {
            const d = next ? await blockUser(id) : await unblockUser(id);
            setProfile((p) => (p ? { ...p, blockedByYou: d.blocked } : p));
            if (next) {
                resetFollow();
                toast.success("User blocked");
            } else {
                toast.success("User unblocked");
            }
        } catch (err) {
            toast.error(err.message || "Could not update block");
        }
        setBusy(false);
    };

    return { busy, toggle };
}
