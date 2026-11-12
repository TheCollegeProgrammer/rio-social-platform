import { useEffect, useState } from "react";
import { useToast } from "../context/useToast";
import { listAppeals, decideAppeal } from "../services/moderationApi";
import "../styles/Admin.css";

const STATUSES = ["pending", "approved", "denied"];

// 6.8: moderator review queue with inline approve/deny decisions.
function AdminAppealsList() {
    const toast = useToast();
    const [status, setStatus] = useState("pending");
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [data, setData] = useState({ appeals: [], total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listAppeals({ status, page })
            .then((d) => { if (!cancelled) { setData(d); setError(""); } })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [status, page, refresh]);

    const decide = async (id, decision) => {
        const decisionNote = window.prompt(
            decision === "approved"
                ? "Why is this appeal approved? (optional, cancel to abort)"
                : "Why is this appeal denied? (optional, cancel to abort)"
        );
        if (decisionNote === null) return;
        try {
            await decideAppeal(id, { status: decision, decisionNote });
            toast.success(`Appeal ${decision}`);
            setRefresh((r) => r + 1);
        } catch (e) { toast.error(e.message); }
    };

    return (
        <div>
            <div className="admin-filters">
                {STATUSES.map((s) => (
                    <button
                        key={s}
                        className={s === status ? "admin-filter active" : "admin-filter"}
                        onClick={() => { setStatus(s); setPage(1); }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {error && <p className="error-message">{error}</p>}

            {loading ? (
                <p className="muted">Loading appeals...</p>
            ) : data.appeals.length === 0 ? (
                <div className="empty-state"><p>No {status} appeals.</p></div>
            ) : (
                <div>
                    {data.appeals.map((a) => (
                        <div key={a._id} className="admin-row" style={{ alignItems: "flex-start" }}>
                            <span className={`admin-pill ${a.status}`}>{a.status}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: "0 0 4px" }}>
                                    @{a.appellant?.username} on {a.report?.targetType || "content"}
                                    {a.report?.resolution ? ` — "${a.report.resolution}"` : ""}
                                </p>
                                <p style={{ margin: "0 0 4px", fontSize: 14 }}>{a.reason}</p>
                                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                                    {new Date(a.createdAt).toLocaleString()}
                                    {a.decisionNote ? ` · ${a.decisionNote}` : ""}
                                </p>
                            </div>
                            {a.status === "pending" && (
                                <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                    <button className="btn btn-sm" onClick={() => decide(a._id, "approved")}>
                                        Approve
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => decide(a._id, "denied")}>
                                        Deny
                                    </button>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="admin-pager">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Prev
                </button>
                <span className="muted">Page {page} / {Math.max(data.totalPages, 1)} · {data.total} appeals</span>
                <button
                    className="btn btn-ghost btn-sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default AdminAppealsList;
