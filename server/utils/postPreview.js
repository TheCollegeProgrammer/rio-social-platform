const Post = require("../models/post");
const { canViewPost } = require("./visibility");

// 7.7: server-rendered share page. Scrapers get og tags (public/authorized
// posts only), humans are redirected into the SPA; missing or restricted
// posts get a content-free 404 page - preview metadata never leaks private
// content and every response is Cache-Control: no-store.

const esc = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

// Same origin resolution as mailer links: CLIENT_ORIGIN, else first CORS entry.
const appOrigin = () =>
    (process.env.CLIENT_ORIGIN ||
        (process.env.CORS_ORIGINS || "").split(",")[0] ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

const spaUrl = (id) => `${appOrigin()}/posts/${id}`;
const absUrl = (req, url) =>
    url.startsWith("http") ? url : `${req.protocol}://${req.get("host")}${url}`;

const page = ({ title, description, url, image, noindex, body }) => `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    ${noindex ? '<meta name="robots" content="noindex" />' : ""}
    <meta property="og:site_name" content="RIO" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(url)}" />
    ${image ? `<meta property="og:image" content="${esc(image)}" />` : ""}
    <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
    <meta http-equiv="refresh" content="0;url=${esc(url)}" />
    <script>location.replace(${JSON.stringify(url)});</script>
</head>
<body>
    <p>${body} <a href="${esc(url)}">Open RIO</a></p>
</body>
</html>`;

const unavailable = (res, id) =>
    res
        .status(404)
        .set("Cache-Control", "no-store")
        .type("html")
        .send(
            page({
                title: "Post unavailable - RIO",
                description: "This post is unavailable, was deleted, or is private.",
                url: spaUrl(id),
                image: "",
                noindex: true,
                body: "This post is unavailable, was deleted, or is private."
            })
        );

const postPreview = async (req, res, next) => {
    try {
        const id = req.params.id;
        const post = await Post.findById(id).populate(
            "author",
            "username name avatar isPrivate"
        );
        if (!post) return unavailable(res, id);
        // Reuse the exact API access policy (visibility + blocks + privacy).
        if (!(await canViewPost(req.user ? req.user.id : null, post))) {
            return unavailable(res, id);
        }

        const url = spaUrl(post._id);
        const content = post.content.trim();
        const excerpt = content.length > 240 ? `${content.slice(0, 240)}…` : content;
        return res
            .set("Cache-Control", "no-store")
            .type("html")
            .send(
                page({
                    title: `${post.author?.name || "RIO user"} on RIO`,
                    description: excerpt || "View this post on RIO",
                    url,
                    image: post.image ? absUrl(req, post.image) : "",
                    noindex: false,
                    body: "This post is loading on RIO…"
                })
            );
    } catch (error) {
        return next(error);
    }
};

module.exports = { postPreview };
