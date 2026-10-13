const fs = require("fs");
const path = require("path");
const { findImage } = require("./seed-image-utils");

const UPLOADS = path.join(__dirname, "uploads");
const PROFILES = require(path.join(__dirname, "..", "profiles_posts.json"));
const MANIFEST = path.join(UPLOADS, "seed-manifest.json");
const LOG = path.join(UPLOADS, "fetch-log.txt");

const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG, line + "\n");
};

const loadManifest = () => {
    try { return JSON.parse(fs.readFileSync(MANIFEST, "utf8")); } catch { return {}; }
};

const saveManifest = (m) => fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2));

const queryFromUnsplashUrl = (url) =>
    (url.split("/s/photos/")[1] || "").replace(/-/g, " ");

const dest = (key) => path.join(UPLOADS, key);

const put = (manifest, key, found) => {
    manifest[key] = {
        file: path.basename(found.file),
        query: found.query,
        title: found.title,
        creator: found.creator,
        license: found.license,
        source: found.source
    };
};

async function run() {
    fs.mkdirSync(UPLOADS, { recursive: true });
    const manifest = loadManifest();
    const tasks = [];

    for (const p of PROFILES) {
        tasks.push({
            key: `${p.username}_avatar`,
            query: queryFromUnsplashUrl(p.profile_image_unsplash) || p.profession,
            wide: false
        });
        for (const post of p.posts) {
            tasks.push({
                key: `${p.username}_p${post.post_no}`,
                query: post.image_search_query,
                wide: true
            });
        }
    }

    const todo = tasks.filter((t) => !manifest[t.key]);
    log(`Images: ${tasks.length} total, ${tasks.length - todo.length} already present, ${todo.length} to fetch`);

    let done = 0, failed = [];
    for (const t of todo) {
        try {
            const found = await findImage(t.query, t.wide, dest(t.key));
            if (found) { put(manifest, t.key, found); done++; }
            else { failed.push(t.key); log(`MISS ${t.key} (${t.query})`); }
        } catch (e) {
            failed.push(t.key);
            log(`ERROR ${t.key}: ${e.message}`);
        }
        if ((done + failed.length) % 10 === 0) {
            saveManifest(manifest);
            log(`progress: ${done + failed.length}/${todo.length}`);
        }
    }

    saveManifest(manifest);
    log(`DONE. fetched: ${done}, failed: ${failed.length}${failed.length ? " -> " + failed.join(", ") : ""}`);
}

run().catch((e) => { log(`FATAL: ${e.message}`); process.exit(1); });
