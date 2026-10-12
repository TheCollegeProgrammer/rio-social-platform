import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserCog } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast.js";
import { changePassword, deleteAccount } from "../services/api";
import { notifyAuthChange } from "../services/sessionSync";
import "../styles/Settings.css";

function Settings() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [pwMessage, setPwMessage] = useState("");
    const [pwError, setPwError] = useState("");
    const [deletePw, setDeletePw] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const handlePassword = async (e) => {
        e.preventDefault();
        try {
            setPwError(""); setPwMessage("");
            await changePassword(currentPw, newPw);
            setPwMessage("Password changed!");
            toast.success("Password changed");
            setCurrentPw(""); setNewPw("");
        } catch (err) { setPwError(err.message); toast.error(err.message); }
    };

    const handleDelete = async (e) => {
        e.preventDefault();
        if (!window.confirm("Delete your account? This cannot be undone.")) return;
        try {
            setDeleteError("");
            await deleteAccount(deletePw);
            setUser(null);
            notifyAuthChange("logout");
            navigate("/login");
        } catch (err) { setDeleteError(err.message); }
    };

    return (
        <div className="page">
            <div className="page-header"><h1>Settings</h1></div>

            <section className="settings-section">
                <h2>Your account</h2>
                <p className="muted" style={{ marginBottom: 14 }}>
                    @{user?.username} · {user?.email}
                </p>
                <Link to="/profile/edit" className="btn">
                    <UserCog size={15} /> Edit profile
                </Link>
            </section>

            <section className="settings-section">
                <h2>Change password</h2>
                {pwMessage && <p className="success-message">{pwMessage}</p>}
                {pwError && <p className="error-message">{pwError}</p>}
                <form className="settings-form" onSubmit={handlePassword}>
                    <div className="field-row">
                        <div className="field">
                            <label>Current password</label>
                            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
                        </div>
                        <div className="field">
                            <label>New password</label>
                            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
                        </div>
                    </div>
                    <div><button type="submit" className="btn">Change password</button></div>
                </form>
            </section>

            <section className="settings-section danger-zone">
                <h2>Delete account</h2>
                {deleteError && <p className="error-message">{deleteError}</p>}
                <form className="settings-form" onSubmit={handleDelete}>
                    <div className="field">
                        <label>Enter your password to confirm</label>
                        <input type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} required />
                    </div>
                    <div><button type="submit" className="btn btn-danger">Delete my account</button></div>
                </form>
            </section>
        </div>
    );
}

export default Settings;
