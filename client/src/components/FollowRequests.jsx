import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import {
    getFollowRequests,
    approveFollowRequest,
    rejectFollowRequest,
    mediaUrl
} from "../services/api";
import { useToast } from "../context/useToast.js";
import "./FollowRequests.css";

// 6.4: pending follow requests for private accounts, rendered above the
// notification feed with inline approve/reject actions.
function FollowRequests({ onChange }) {
    const [requests, setRequests] = useState([]);
    const [busy, setBusy] = useState("");
    const { error: toastError, success } = useToast();

    const load = useCallback(() => {
        getFollowRequests()
            .then((d) => setRequests(d.requests || []))
            .catch(() => {});
    }, []);

    useEffect(load, [load]);

    const act = async (id, action) => {
        setBusy(id);
        try {
            if (action === "approve") {
                await approveFollowRequest(id);
                success("Follow request approved");
            } else {
                await rejectFollowRequest(id);
                success("Follow request rejected");
            }
            setRequests((prev) => prev.filter((r) => r._id !== id));
            onChange?.();
        } catch (err) {
            toastError(err.message || "Could not update request");
        } finally {
            setBusy("");
        }
    };

    if (requests.length === 0) return null;

    return (
        <section className="follow-requests">
            <h2>Follow requests</h2>
            {requests.map((r) => (
                <div className="follow-request" key={r._id}>
                    <Link to={`/users/${r.requester?._id}`} className="follow-request-user">
                        {r.requester?.avatar ? (
                            <img src={mediaUrl(r.requester.avatar)} alt="" />
                        ) : (
                            <span>{r.requester?.name?.charAt(0).toUpperCase()}</span>
                        )}
                        <span className="follow-request-meta">
                            <strong>{r.requester?.name}</strong>
                            <em>@{r.requester?.username}</em>
                        </span>
                    </Link>
                    <div className="follow-request-actions">
                        <button
                            className="btn btn-sm"
                            disabled={busy === r._id}
                            onClick={() => act(r._id, "approve")}
                        >
                            <Check size={15} /> Approve
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            disabled={busy === r._id}
                            onClick={() => act(r._id, "reject")}
                        >
                            <X size={15} /> Reject
                        </button>
                    </div>
                </div>
            ))}
        </section>
    );
}

export default FollowRequests;
