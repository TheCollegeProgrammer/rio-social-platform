import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
    updateProfile, changePassword, deleteAccount,
    uploadAvatar, uploadCover, deleteUploadedImage
} from "../services/api";
import { useToast } from "../context/useToast.js";
import ImageUpload from "../components/ImageUpload";
import "../styles/Settings.css";

function Settings() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [name, setName] = useState(user?.name || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [pwMessage, setPwMessage] = useState("");
    const [pwError, setPwError] = useState("");
    const [deletePw, setDeletePw] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const handleProfile = async (e) => {
        e.preventDefault();
        try {
            setError(""); setMessage("");
            const data = await updateProfile({ name, bio, isPrivate });
            setUser(data.user);
            setMessage("Profile updated!");
            toast.success("Profile updated");
        } catch (err) { setError(err.message); toast.error(err.message); }
    };

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
            navigate("/login");
        } catch (err) { setDeleteError(err.message); }
    };

    return (
        <div className="page">
            <div className="page-header"><h1>Settings</h1></div>

            <section className="settings-section">
                <h2>Profile</h2>
                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}
                <form className="settings-form" onSubmit={handleProfile}>
                    <div className="field-row">
                        <div className="field">
                            <label>Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
                        </div>
                        <div className="field">
                            <label>Username</label>
                            <input type="text" value={user?.username || ""} disabled />
                        </div>
                    </div>
                    <div className="field">
                        <label>Bio</label>
                        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} />
                    </div>
                    <label className="checkbox-field">
                        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                        Private account
                    </label>
                    <div><button type="submit" className="btn">Save profile</button></div>
                </form>
            </section>

            <section className="settings-section">
                <h2>Photos</h2>
                <div className="settings-form">
                    <ImageUpload
                        label="Profile photo"
                        current={user?.avatar}
                        round
                        onUpload={async (f) => { const d = await uploadAvatar(f); setUser((u) => ({ ...u, avatar: d.avatar })); }}
                        onDelete={async () => { await deleteUploadedImage("avatar"); setUser((u) => ({ ...u, avatar: "" })); }}
                    />
                    <ImageUpload
                        label="Cover photo"
                        current={user?.coverImage}
                        onUpload={async (f) => { const d = await uploadCover(f); setUser((u) => ({ ...u, coverImage: d.coverImage })); }}
                        onDelete={async () => { await deleteUploadedImage("coverImage"); setUser((u) => ({ ...u, coverImage: "" })); }}
                    />
                </div>
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
