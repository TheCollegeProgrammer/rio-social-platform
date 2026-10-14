import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/api";
import { useAuth } from "../context/useAuth";
import "../styles/Auth.css";

function Register() {
    const [formData, setFormData] = useState({
        username: "", name: "", age: "", email: "", password: ""
    });
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
            await registerUser({ ...formData, age: Number(formData.age) });
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
                <h1>Create account</h1>
                <p className="auth-subtitle">Join the community</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <input name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />
                    <input name="name" placeholder="Full name" value={formData.name} onChange={handleChange} required />
                    <input name="age" type="number" placeholder="Age" value={formData.age} onChange={handleChange} required min={13} />
                    <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                    <input name="password" type="password" placeholder="Password (min 8 chars)" value={formData.password} onChange={handleChange} required minLength={8} />

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? "Creating..." : "Create account"}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;
