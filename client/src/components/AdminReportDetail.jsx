import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useToast } from "../context/useToast";
import { getReport, updateReport, suspendUser, restoreUser } from "../services/moderationApi";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"];

// Context panel body: content for posts/comments, profile card for users.
function ContextBlock({ context }) {
    if (!context) return <div className="admin-context">Target no longer exists.</div>;
    if (context.kind === "user") {
        return (
            <div className="admin-context">
                <strong>{context.name}</strong> @{context.username}{context.bio ? ` — ${context.bio}` : ""}{context.isSuspended ? " · SUSPENDED" : ""}
            </div>
        );
    }
    const author = context.author;
    return (
        <div className="admin-context">
            <strong>{author?.name}</strong> @{author?.username}{author?.isSuspended ? " · SUSPENDED" : ""} · {new Date(context.createdAt).toLocaleString()}
            {"\n"}{context.content}
        </div>
    );
}

function AdminReportDetail({ id, onClose, onChanged }) {
    const toast = useToast();
    const [report, setReport] = useState(null);
    const [context, setContext] = useState(null);
    const [status, setStatus] = useState("open");
    const [resolution, setResolution] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = () => getReport(id).then((d) => {
        setReport(d.report);
        setStatus(d.report.status);
        setResolution(d.report.resolution || "");
        setContext(d.context);
    });

    useEffect(() => {
        let cancelled = false;
        setError("");
        setReport(null);
        load().catch((e) => { if (!cancelled) setError(e.message); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const save = async () => {
        setBusy(true);
        try {
            const d = await updateReport(id, { status, resolution });
            setReport(d.report);
            toast.success("Report updated");
            onChanged();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    const subject = report?.targetType === "user" ? context : context?.author;
    const toggleSuspend = async () => {
        if (!subject?._id || busy) return;
        if (!subject.isSuspended && !window.confirm(`Suspend @${subject.username}?`)) return;
        setBusy(true);
        try {
            if (subject.isSuspended) {
                await restoreUser(subject._id);
                toast.success("User restored");
            } else {
                await suspendUser(subject._id, "Moderation action");
                toast.success("User suspended");
            }
            await load();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    if (!report || error) return (
        <div className="admin-detail" onClick={onClose}>
            <div className="admin-detail-panel" onClick={(e) => e.stopPropagation()}>
                {error ? <p className="error-message">{error}</p> : <p className="muted">Loading...</p>}
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
        </div>
    );

    return (
        <div className="admin-detail" onClick={onClose}>
            <div className="admin-detail-panel" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0 }}>Report <span className={`admin-pill ${report.status}`}>{report.status}</span></h2>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={15} /></button>
                </div>
                <p className="muted">
                    {report.targetType} · by @{report.reporter?.username} · {new Date(report.createdAt).toLocaleString()}
                </p>
                <p><strong>Reason:</strong> {report.reason}</p>

                <ContextBlock context={context} />

                <div className="field">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label>Resolution note</label>
                    <textarea
                        rows={2}
                        maxLength={500}
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="What did you conclude?"
                    />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-sm" onClick={save} disabled={busy}>
                        {busy ? "Saving..." : "Save update"}
                    </button>
                    {subject?._id && (
                        <button className="btn btn-ghost btn-sm" onClick={toggleSuspend} disabled={busy}>
                            {subject.isSuspended ? "Restore user" : "Suspend user"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminReportDetail;
