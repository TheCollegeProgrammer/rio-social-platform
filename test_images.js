const http = require("http");

const PNG_1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
);

function jsonReq(method, path, body, cookie) {
    return new Promise((resolve) => {
        const headers = { "Content-Type": "application/json" };
        if (cookie) headers.Cookie = cookie;
        const r = http.request({ hostname: "localhost", port: 3000, path, method, headers }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve({ status: res.statusCode, data, headers: res.headers }));
        });
        r.on("error", (e) => resolve({ status: 0, data: e.message }));
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

function multipartReq(path, fields, cookie) {
    return new Promise((resolve) => {
        const boundary = "----testboundary1234567890";
        let parts = "";
        for (const [k, v] of Object.entries(fields)) {
            parts += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        }
        parts += `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`;
        const tail = `\r\n--${boundary}--\r\n`;
        const body = Buffer.concat([
            Buffer.from(parts, "utf8"),
            PNG_1x1,
            Buffer.from(tail, "utf8")
        ]);

        const headers = {
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": body.length
        };
        if (cookie) headers.Cookie = cookie;

        const r = http.request({ hostname: "localhost", port: 3000, path, method: "POST", headers }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve({ status: res.statusCode, data }));
        });
        r.on("error", (e) => resolve({ status: 0, data: e.message }));
        r.end(body);
    });
}

function getReq(path) {
    return new Promise((resolve) => {
        http.get({ hostname: "localhost", port: 3000, path }, (res) => {
            let size = 0;
            res.on("data", (c) => (size += c.length));
            res.on("end", () => resolve({ status: res.statusCode, size }));
        }).on("error", (e) => resolve({ status: 0, size: e.message }));
    });
}

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
    const ok = actual === expected;
    ok ? pass++ : fail++;
    console.log(`  ${ok ? "PASS" : "FAIL"}: ${name}${ok ? "" : ` (expected ${expected}, got ${actual})`}`);
};

async function run() {
    const ts = Date.now();

    console.log("=== SETUP ===");
    let r = await jsonReq("POST", "/api/auth/register", {
        username: `img${ts}`, name: "Img", age: 25, email: `img${ts}@t.com`, password: "pass1234"
    });
    check("Register", r.status, 201);

    r = await jsonReq("POST", "/api/auth/login", { email: `img${ts}@t.com`, password: "pass1234" });
    check("Login", r.status, 200);
    const cookie = r.headers["set-cookie"] ? r.headers["set-cookie"][0] : null;

    console.log("=== AVATAR UPLOAD ===");
    r = await multipartReq("/api/upload/avatar", {}, cookie);
    check("Upload avatar", r.status, 200);
    const avatar = JSON.parse(r.data).avatar;
    check("Avatar path", avatar.startsWith("/uploads/"), true);

    let file = await getReq(avatar);
    check("Avatar file served", file.status, 200);
    check("Avatar bytes", file.size, PNG_1x1.length);

    r = await multipartReq("/api/upload/avatar", {}, cookie);
    check("Re-upload replaces", r.status, 200);
    const avatar2 = JSON.parse(r.data).avatar;
    check("New avatar differs", avatar2 !== avatar, true);

    file = await getReq(avatar);
    check("Old avatar deleted", file.status, 404);

    console.log("=== COVER UPLOAD ===");
    r = await multipartReq("/api/upload/cover", {}, cookie);
    check("Upload cover", r.status, 200);
    const cover = JSON.parse(r.data).coverImage;
    file = await getReq(cover);
    check("Cover served", file.status, 200);

    console.log("=== PROFILE REFLECTS IMAGES ===");
    r = await jsonReq("GET", "/api/profile/me", null, cookie);
    if (r.status !== 200) {
        r = await jsonReq("GET", "/api/auth/me", null, cookie);
    }
    const user = JSON.parse(r.data).user;
    check("User has avatar", user.avatar, avatar2);
    check("User has cover", user.coverImage, cover);

    console.log("=== DELETE IMAGES ===");
    r = await jsonReq("DELETE", "/api/upload/avatar", null, cookie);
    check("Delete avatar", r.status, 200);
    file = await getReq(avatar2);
    check("Avatar file gone", file.status, 404);

    r = await jsonReq("DELETE", "/api/upload/coverImage", null, cookie);
    check("Delete cover", r.status, 200);
    file = await getReq(cover);
    check("Cover file gone", file.status, 404);

    console.log("=== POST WITH IMAGE ===");
    r = await multipartReq("/api/posts/image", { content: "Look at this #photo" }, cookie);
    check("Create post with image", r.status, 201);
    const postData = JSON.parse(r.data).post;
    check("Post has image", postData.image.startsWith("/uploads/"), true);
    check("Hashtag extracted", postData.hashtags.includes("#photo"), true);
    const postImg = postData.image;
    const postId = postData._id;

    file = await getReq(postImg);
    check("Post image served", file.status, 200);

    r = await jsonReq("GET", `/api/posts/${postId}`, null, cookie);
    check("Get post has image", JSON.parse(r.data).post.image, postImg);

    r = await jsonReq("DELETE", `/api/posts/${postId}/image`, null, cookie);
    check("Remove post image", r.status, 200);

    file = await getReq(postImg);
    check("Post image file deleted", file.status, 404);

    console.log("=== POST DELETE CLEANS IMAGE ===");
    r = await multipartReq("/api/posts/image", { content: "temp post" }, cookie);
    const post2 = JSON.parse(r.data).post;
    const post2Img = post2.image;
    r = await jsonReq("DELETE", `/api/posts/${post2._id}`, null, cookie);
    check("Delete post", r.status, 200);
    file = await getReq(post2Img);
    check("Post image cleaned up", file.status, 404);

    console.log("=== VALIDATION ===");
    r = await multipartReq("/api/posts/image", { content: "" }, cookie);
    check("Empty content rejected", r.status, 400);

    r = await jsonReq("POST", "/api/upload/avatar", {}, cookie);
    check("JSON body no file rejected", r.status, 400);

    r = await jsonReq("POST", "/api/posts/image", { content: "no file here" }, cookie);
    check("No file creates image-less post", r.status, 201);
    check("Post image is null", JSON.parse(r.data).post.image, null);

    console.log("=== UNAUTHENTICATED ===");
    r = await multipartReq("/api/upload/avatar", {}, null);
    check("No auth upload", r.status, 401);

    console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
    process.exit(fail > 0 ? 1 : 0);
}

run();
