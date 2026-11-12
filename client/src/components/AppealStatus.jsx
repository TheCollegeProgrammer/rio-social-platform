import { useEffect, useState } from "react";
import { getMyAppeals } from "../services/moderationApi";
import "../styles/Admin.css";
import "./AppealStatus.css";

// 6.8: user-facing appeal status view (shown only when appeals exist).
function AppealStatus() {
    const [appeals, setAppeals] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getMyAppeals()
            .then((d) => { if (!cancelled) setAppeals(d.appeals); })
            .catch((e) => { if (!cancelled) setError(e.message); });
        return () => { cancelled = true; };
    }, []);

    if (error) return <p className="error-message">{error}</p>;
    if (!appeals || appeals.length === 0) return null;

    return (
        <section className="appeal-status">
            <h2>My appeals</h2>
            {appeals.map((a) => (
                <div key={a._id} className="appeal-status-row">
                    <span className={`admin-pill ${a.status}`}>{a.status}</span>
                    <div>
                        <p>{a.reason}</p>
                        <p className="muted">
                            Decision on {a.report?.targetType || "content"}
                            {a.report?.resolution ? `: ${a.report.resolution}` : ""}
                            {a.decisionNote ? ` · Reviewer: ${a.decisionNote}` : ""}
                            {a.status === "pending" ? " · Awaiting review" : ""}
                        </p>
                    </div>
                </div>
            ))}
        </section>
    );
}

export default AppealStatus;
