const https = require("https");

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const get = (url, redirects = 0) => new Promise((resolve, reject) => {
    const req = https.get(url, { headers: UA }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirects < 5) {
            r.resume();
            return resolve(get(new URL(r.headers.location, url).href, redirects + 1));
        }
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => resolve({ status: r.statusCode, headers: r.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
});

// Openverse anonymous: 20/min burst, 200/day sustained
const searchImages = async (query, wide) => {
    const aspect = wide ? "&aspect_ratio=wide" : "";
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=5${aspect}`;
    for (let attempt = 0; ; attempt++) {
        const r = await get(url).catch(() => null);
        if (r && r.status === 200) return JSON.parse(r.body.toString()).results || [];
        if (r && r.status === 429 && attempt < 2) { console.log("  rate limited, waiting 60s..."); await sleep(60000); continue; }
        if (r && r.status === 400 && wide) return null; // aspect filter unsupported -> caller retries plain
        return [];
    }
};

const extFor = (headers, url) => {
    const ct = (headers["content-type"] || "").split(";")[0].trim();
    const map = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
    if (map[ct]) return map[ct];
    const m = url.match(/\.(jpe?g|png|webp|gif)$/i);
    return m ? `.${m[0].slice(-3).toLowerCase().replace("jpeg", "jpg")}` : ".jpg";
};

const downloadFirst = async (candidates, destBase) => {
    for (const img of candidates) {
        if (!img.url || (img.width || 0) < 500) continue;
        const r = await get(img.url).catch(() => null);
        if (!r || r.status !== 200 || r.body.length < 6000) continue;
        const ext = extFor(r.headers, img.url);
        const file = `${destBase}${ext}`;
        require("fs").writeFileSync(file, r.body);
        return {
            file,
            title: img.title || "",
            creator: img.creator || "",
            license: `${img.license || ""} ${img.license_version || ""}`.trim(),
            source: img.foreign_landing_url || img.url
        };
    }
    return null;
};

// Search -> if empty, progressively drop trailing words (min 2)
const findImage = async (query, wide, destBase) => {
    const words = query.split(/\s+/);
    for (let keep = words.length; keep >= 2; keep--) {
        const q = words.slice(0, keep).join(" ");
        let results = await searchImages(q, wide);
        // first try only: if aspect filter yielded nothing, retry without it
        if (wide && keep === words.length && (!results || !results.length)) {
            results = await searchImages(q, false);
        }
        await sleep(3100);
        if (!results || !results.length) continue;
        const usable = results.filter((i) => (i.width || 0) >= 500);
        const hit = await downloadFirst(usable.length ? usable : results, destBase);
        if (hit) return { ...hit, query: q };
    }
    return null;
};

module.exports = { get, sleep, findImage };
