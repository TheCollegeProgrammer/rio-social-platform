import { useState } from "react";
import { useToast } from "../context/useToast.js";
import { muteUser, unmuteUser } from "../services/api";

// 6.2: mute/unmute toggle for the profile page. Soft by design - no follow
// state changes, the muted user keeps full interaction rights.
export function useProfileMute(profile, setProfile) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const toggle = async (id) => {
        const next = !profile.mutedByYou;
        setBusy(true);
        try {
            const d = next ? await muteUser(id) : await unmuteUser(id);
            setProfile((p) => (p ? { ...p, mutedByYou: d.muted } : p));
            toast.success(next ? "User muted" : "User unmuted");
        } catch (err) {
            toast.error(err.message || "Could not update mute");
        }
        setBusy(false);
    };

    return { busy, toggle };
}
