import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { resetPassword } from "../services/api";
import "../styles/Auth.css";

function ResetPassword() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const token = params.get("token");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }
        try {
            setLoading(true);
            setError("");
            await resetPassword(token, password);
            setDone(true);
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-brand"><strong>SocialApp</strong></div>
                    <h1>Invalid link</h1>
                    <p className="error-message">This reset link is missing its token.</p>
                    <p className="auth-switch">
                        <Link to="/forgot-password">Request a new link</Link>
                    </p>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-brand"><strong>SocialApp</strong></div>
                    <h1>Password updated</h1>
                    <p className="success-message"><CheckCircle2 size={14} /> Redirecting to login...</p>
                    <p className="auth-switch"><Link to="/login">Log in now</Link></p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand"><strong>SocialApp</strong></div>
                <h1>Set a new password</h1>
                <p className="auth-subtitle">Your new password must be at least 8 characters</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="New password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                    />
                    <input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                    />

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? "Saving..." : "Reset password"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;
