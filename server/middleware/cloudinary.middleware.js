const { enabled, uploadBuffer } = require("../config/cloudinary");

const pushToCloudinary = (folder) => async (req, res, next) => {
    if (!enabled) return next();
    try {
        const files = req.file ? [req.file] : req.files || [];
        for (const f of files) {
            if (!f.buffer) continue;
            const result = await uploadBuffer(f.buffer, folder);
            f.remoteUrl = result.secure_url;
            f.remotePublicId = result.public_id;
        }
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = { pushToCloudinary };
