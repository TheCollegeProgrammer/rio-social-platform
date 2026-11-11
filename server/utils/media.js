const path = require("path");
const fs = require("fs");
const { isRemote } = require("../config/cloudinary");
const { enqueueDestroy } = require("./mediaQueue");

const uploadDir = path.join(__dirname, "..", "uploads");

// P0-05/F-08: single cleanup path for stored media. Local files are unlinked
// immediately; remote (Cloudinary) assets go through the durable retry queue
// so a transient API failure can no longer leave permanent orphans.
const deleteMedia = (list) => {
    for (const url of list || []) {
        if (!url) continue;
        if (isRemote(url)) {
            void enqueueDestroy(url);
            continue;
        }
        try {
            const fp = path.join(uploadDir, path.basename(url));
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch {
            // best-effort local cleanup
        }
    }
};

module.exports = { deleteMedia };
