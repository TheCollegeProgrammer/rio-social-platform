import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { listReports } from "../services/moderationApi";
import AdminReportDetail from "../components/AdminReportDetail";
import AdminAppealsList from "../components/AdminAppealsList";
import "../styles/Home.css";
import "../styles/Admin.css";

const STATUSES = ["all", "open", "reviewing", "resolved", "dismissed"];

function AdminDashboard() {
    const { user } = useAuth();
    const [tab, setTab] = useState("reports");
    const [status, setStatus] = useState("open");
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [data, setData] = useState({ reports: [], total: 0, totalPages: 1 });
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listReports({ status: status === "all" ? "" : status, page })
            .then((d) => { if (!cancelled) { setData(d); setError(""); } })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [status, page, refresh]);

    if (user?.role !== "admin") return <Navigate to="/" replace />;

    return (
        <main className="home">
            <div className="home-header"><h1>Moderation queue</h1></div>

            <div className="admin-filters">
                <button
                    className={tab === "reports" ? "admin-filter active" : "admin-filter"}
                    onClick={() => setTab("reports")}
                >
                    Reports
                </button>
                <button
                    className={tab === "appeals" ? "admin-filter active" : "admin-filter"}
                    onClick={() => setTab("appeals")}
                >
                    Appeals
                </button>
                {tab === "reports" && STATUSES.map((s) => (
                    <button
                        key={s}
                        className={s === status ? "admin-filter active" : "admin-filter"}
                        onClick={() => { setStatus(s); setPage(1); }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {tab === "appeals" && <AdminAppealsList />}

            {tab === "reports" && (
                <>
                    {error && <p className="error-message">{error}</p>}

            {loading ? (
                <p className="muted">Loading reports...</p>
            ) : data.reports.length === 0 ? (
                <div className="empty-state"><p>No reports with this status.</p></div>
            ) : (
                <div>
                    {data.reports.map((rep) => (
                        <button key={rep._id} className="admin-row" onClick={() => setSelected(rep._id)}>
                            <span className={`admin-pill ${rep.status}`}>{rep.status}</span>
                            <span className="admin-meta">{rep.targetType}</span>
                            <span className="admin-reason">{rep.reason}</span>
                            <span className="admin-meta">
                                @{rep.reporter?.username} · {new Date(rep.createdAt).toLocaleDateString()}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <div className="admin-pager">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Prev
                </button>
                <span className="muted">Page {page} / {Math.max(data.totalPages, 1)} · {data.total} reports</span>
                <button
                    className="btn btn-ghost btn-sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                >
                    Next
                </button>
            </div>

            {selected && (
                <AdminReportDetail
                    id={selected}
                    onClose={() => setSelected(null)}
                    onChanged={() => setRefresh((r) => r + 1)}
                />
            )}
                </>
            )}
        </main>
    );
}

export default AdminDashboard;
