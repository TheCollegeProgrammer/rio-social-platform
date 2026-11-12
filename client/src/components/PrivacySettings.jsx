import { useState } from "react";
import { useToast } from "../context/useToast.js";
import { updatePrivacy } from "../services/api";

const FIELDS = [
    ["commentAudience", "Comments on your posts"],
    ["mentionAudience", "Mentions of you"],
    ["messageAudience", "Direct messages"]
];

const OPTIONS = [
    ["everyone", "Everyone"],
    ["followers", "Followers only"]
];

export default function PrivacySettings({ user, setUser }) {
    const toast = useToast();
    const [saving, setSaving] = useState(false);
    const [values, setValues] = useState({
        commentAudience: user?.commentAudience || "everyone",
        mentionAudience: user?.mentionAudience || "everyone",
        messageAudience: user?.messageAudience || "everyone"
    });

    const save = async (field, value) => {
        const previous = values;
        setValues({ ...values, [field]: value });
        setSaving(true);
        try {
            const data = await updatePrivacy({ [field]: value });
            setUser(data.user);
            toast.success("Privacy setting saved");
        } catch (err) {
            setValues(previous);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="settings-section">
            <h2>Privacy</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
                Choose who can reach you. Followers are people who follow your account.
            </p>
            {FIELDS.map(([field, label]) => (
                <div className="field-row" key={field}>
                    <label>{label}</label>
                    <select
                        value={values[field]}
                        disabled={saving}
                        onChange={(e) => save(field, e.target.value)}
                        aria-label={label}
                    >
                        {OPTIONS.map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                        ))}
                    </select>
                </div>
            ))}
        </section>
    );
}
