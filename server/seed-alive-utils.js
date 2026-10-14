const fs = require("fs");
const path = require("path");

const loadJson = (name) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data", name), "utf8"));

// deterministic PRNG so re-runs produce the same engagement
const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];

// date N days ago (+ optional minutes)
const ago = (days, minutes = 0) =>
    new Date(Date.now() - days * 86400000 - minutes * 60000);

// distinct picks without replacement
const pickDistinct = (rand, items, n, excludeId) => {
    const pool = items.filter((x) => !x._id.equals(excludeId));
    const out = [];
    while (out.length < n && pool.length) {
        out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    }
    return out;
};

const topicFor = (post, tagMap) => {
    for (const h of post.hashtags || []) {
        if (tagMap[h]) return tagMap[h];
    }
    return "generic";
};

module.exports = { loadJson, rng, pick, ago, pickDistinct, topicFor };
