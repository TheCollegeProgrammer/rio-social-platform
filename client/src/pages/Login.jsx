import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";
import { useAuth } from "../context/useAuth";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import "../styles/Auth.css";

function Login() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { user, manualLogin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate("/");
    }, [user, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await loginUser(formData);
            await manualLogin();
            setError("");
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
                <TextEffect as="h1" preset="fade-in-blur" per="word">Welcome back</TextEffect>
                <p className="auth-subtitle">Log in to your account</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoComplete="current-password"
                    />

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <p className="auth-switch">
                    <Link to="/forgot-password">Forgot password?</Link>
                </p>

                <p className="auth-switch">
                    Don't have an account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
