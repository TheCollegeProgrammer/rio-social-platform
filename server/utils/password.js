const { hash, verify, Algorithm } = require("@node-rs/argon2");
const bcrypt = require("bcrypt");

// OWASP password-storage baseline for Argon2id: 19 MiB memory, 2 passes,
// 1 lane (m=19456, t=2, p=1).
const ARGON_OPTS = {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
};

const hashPassword = (plain) => hash(plain, ARGON_OPTS);

// P0-04: new hashes are argon2id. Existing users still hold bcrypt hashes -
// those verify via bcrypt, then get transparently upgraded on next login
// (see needsRehash + login handler). Handles malformed/missing hashes as
// a failed verification, never a throw.
const verifyPassword = async (stored, plain) => {
    if (typeof stored !== "string" || !stored) return false;
    if (stored.startsWith("$argon2")) {
        try {
            return await verify(stored, plain);
        } catch {
            return false;
        }
    }
    try {
        return await bcrypt.compare(plain, stored);
    } catch {
        return false;
    }
};

const needsRehash = (stored) =>
    typeof stored === "string" && stored.startsWith("$2");

module.exports = { hashPassword, verifyPassword, needsRehash };
