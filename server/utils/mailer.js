const fs = require("fs/promises");
const path = require("path");

const OUTBOX = path.join(__dirname, "..", ".reset-outbox.json");

const appOrigin = () => {
    const fromEnv =
        process.env.CLIENT_ORIGIN ||
        (process.env.CORS_ORIGINS || "").split(",")[0] ||
        "http://localhost:5173";
    return fromEnv.replace(/\/+$/, "");
};

const buildLink = (token) => `${appOrigin()}/reset-password?token=${token}`;

// Dev/test outbox (kept on disk so local flows/tests can complete). The file
// is gitignored and NEVER written in production.
const outboxAppend = async (entry) => {
    try {
        const raw = await fs.readFile(OUTBOX, "utf8");
        const list = JSON.parse(raw);
        list.push(entry);
        await fs.writeFile(OUTBOX, JSON.stringify(list.slice(-50), null, 2));
    } catch {
        await fs.writeFile(OUTBOX, JSON.stringify([entry], null, 2));
    }
};

const sendViaResend = async (email, link) => {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESET_EMAIL_FROM;
    if (!key || !from) return false;
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from,
            to: [email],
            subject: "Reset your RIO password",
            text: `Reset your RIO password: ${link}`,
            html: `<p>Reset your RIO password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`
        })
    });
    return res.ok;
};

// P0-03 delivery policy: production sends through Resend (env-driven HTTP,
// no SDK) and logs a warning - never the token - if credentials are missing.
// Dev/test append to a local outbox and print the link for manual use.
const deliverResetEmail = async (email, token) => {
    const link = buildLink(token);
    if (process.env.NODE_ENV === "production") {
        const sent = await sendViaResend(email, link).catch(() => false);
        if (!sent) {
            console.warn(
                "[mailer] reset email NOT delivered: set RESEND_API_KEY and RESET_EMAIL_FROM"
            );
        }
        return;
    }
    await outboxAppend({ email, token, link, at: new Date().toISOString() });
    console.log(`[mailer] password reset link for ${email}: ${link}`);
};

module.exports = { deliverResetEmail, OUTBOX };
