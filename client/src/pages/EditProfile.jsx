import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast.js";
import { updateProfile, uploadAvatar, uploadCover, deleteUploadedImage } from "../services/api";
import ImageUpload from "../components/ImageUpload";
import "../styles/Settings.css";

function EditProfile() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [name, setName] = useState(user?.name || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError("");
            const data = await updateProfile({ name, bio, isPrivate });
            setUser(data.user);
            toast.success("Profile updated");
            navigate("/profile");
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header edit-profile-header">
                <Link to="/profile" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> Back</Link>
                <h1>Edit profile</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            <section className="settings-section">
                <h2>Photos</h2>
                <div className="settings-form">
                    <ImageUpload
                        label="Profile photo"
                        current={user?.avatar}
                        round
                        onUpload={async (f) => { const d = await uploadAvatar(f); setUser((u) => ({ ...u, avatar: d.avatar })); toast.success("Profile photo updated"); }}
                        onDelete={async () => { await deleteUploadedImage("avatar"); setUser((u) => ({ ...u, avatar: "" })); }}
                    />
                    <ImageUpload
                        label="Cover photo"
                        current={user?.coverImage}
                        onUpload={async (f) => { const d = await uploadCover(f); setUser((u) => ({ ...u, coverImage: d.coverImage })); toast.success("Cover photo updated"); }}
                        onDelete={async () => { await deleteUploadedImage("coverImage"); setUser((u) => ({ ...u, coverImage: "" })); }}
                    />
                </div>
            </section>

            <section className="settings-section">
                <h2>Details</h2>
                <form className="settings-form" onSubmit={handleSave}>
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
                    <div><button type="submit" className="btn" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
                </form>
            </section>
        </div>
    );
}

export default EditProfile;
