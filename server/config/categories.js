const CATEGORIES = ["motivation", "billionaire-mindset", "f1", "motorsport"];

const normalizeCategory = (value) => {
    if (!value) return null;
    const slug = String(value).trim().toLowerCase();
    return CATEGORIES.includes(slug) ? slug : null;
};

module.exports = { CATEGORIES, normalizeCategory };
