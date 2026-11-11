// Refuses to run destructive seed scripts against a production context.
// Usage: FORCE_SEED=1 node seed.js   (explicit override only)
const guard = () => {
    if (process.env.NODE_ENV === "production" && process.env.FORCE_SEED !== "1") {
        console.error(
            "SEED BLOCKED: refusing to run with NODE_ENV=production. " +
            "Set FORCE_SEED=1 only if you are certain."
        );
        process.exit(1);
    }
};

guard();

module.exports = guard;
