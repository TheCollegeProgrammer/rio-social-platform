const cloudinary = require("cloudinary").v2;

const enabled =
    process.env.NODE_ENV !== "test" &&
    Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

if (enabled) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

const uploadBuffer = (buffer, folder) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `rio/${folder}`, resource_type: "image" },
            (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
    });

const isRemote = (url) => typeof url === "string" && url.includes("res.cloudinary.com");

const publicIdFromUrl = (url) => {
    const match = /\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+(?:$|\?)/.exec(url);
    return match ? match[1] : null;
};

const destroyRemote = (url) => {
    if (!enabled || !isRemote(url)) return;
    const publicId = publicIdFromUrl(url);
    if (publicId) cloudinary.uploader.destroy(publicId).catch(() => {});
};

module.exports = { cloudinary, enabled, uploadBuffer, isRemote, destroyRemote };
