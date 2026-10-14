import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { forgotPassword } from "../services/api";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import "../styles/Auth.css";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");
            setStatus("");
            await forgotPassword(email);
            setStatus("If an account exists for that email, a reset link has been sent.");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand"><img className="brand-logo brand-logo-light" src="/Rio-logo-Light-theme.png" alt="RIO" /><img className="brand-logo brand-logo-dark" src="/Rio-logo-Dark-theme.png" alt="RIO" /></div>
                <TextEffect as="h1" preset="fade-in-blur" per="word">Forgot password?</TextEffect>
                <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />

                    {error && <p className="error-message">{error}</p>}
                    {status && (
                        <p className="success-message"><Mail size={14} /> {status}</p>
                    )}

                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? "Sending..." : "Send reset link"}
                    </button>
                </form>

                <p className="auth-switch">
                    Remembered it? <Link to="/login">Back to login</Link>
                </p>
            </div>
        </div>
    );
}

export default ForgotPassword;
