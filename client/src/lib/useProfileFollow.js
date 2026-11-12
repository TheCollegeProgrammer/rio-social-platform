import { useState } from "react";
import { useToast } from "../context/useToast.js";
import { useFollowToggle } from "./useFollowToggle";

// 4.4 + 6.4: follow state for a profile page. Handles all three server
// outcomes - direct follow, private-account request, and request cancel -
// with optimistic flip, reconcile and rollback. Counts live in the caller's
// profile state via setProfile.
export function useProfileFollow(setProfile) {
    const toast = useToast();
    const { toggle: followToggle } = useFollowToggle();
    const [following, setFollowing] = useState(false);
    const [followRequested, setFollowRequested] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);

    // Load-time sync from a profile response.
    const sync = (data) => {
        setFollowing(!!data?.isFollowing);
        setFollowRequested(!!data?.followRequested);
    };

    const handleFollow = async (id, displayName) => {
        const next = !following;
        // Captured before the await so reconcile/rollback can tell a
        // cancellation (was requested) apart from a fresh follow.
        const wasRequested = followRequested;
        setFollowBusy(true);
        await followToggle(id, next, {
            optimistic: (n) => {
                if (wasRequested && n) {
                    // Cancelling a request: no edge ever existed, no count change.
                    setFollowRequested(false);
                } else {
                    setFollowing(n);
                    if (!n) setFollowRequested(false);
                    setProfile((p) => (p ? { ...p, followersCount: (p.followersCount || 0) + (n ? 1 : -1) } : p));
                }
            },
            reconcile: (d) => {
                setFollowing(d.following);
                setFollowRequested(!!d.pending);
                setProfile((p) => ({
                    ...p,
                    followersCount: d.followersCount,
                    followingCount: d.followingCount ?? p.followingCount
                }));
                if (d.following) toast.success(`Following ${displayName || "user"}`);
                else if (d.pending) toast.success("Follow request sent");
                else if (wasRequested) toast.success("Follow request cancelled");
            },
            rollback: (n) => {
                if (wasRequested && n) {
                    setFollowRequested(true);
                } else {
                    setFollowing(!n);
                    setProfile((p) => (p ? { ...p, followersCount: (p.followersCount || 0) + (n ? -1 : 1) } : p));
                }
            }
        });
        setFollowBusy(false);
    };

    return { following, followRequested, followBusy, sync, handleFollow };
}
