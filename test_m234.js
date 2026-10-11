const http = require("http");

function req(method, path, body, cookie) {
    return new Promise((resolve) => {
        const headers = { "Content-Type": "application/json" };
        if (cookie) headers.Cookie = cookie;
        const r = http.request(
            { hostname: "localhost", port: 3000, path, method, headers },
            (res) => {
                let data = "";
                res.on("data", (c) => (data += c));
                res.on("end", () =>
                    resolve({ status: res.statusCode, data, cookie: res.headers["set-cookie"] })
                );
            }
        );
        r.on("error", (e) => resolve({ status: 0, data: e.message }));
        if (body) r.write(JSON.stringify(body));
        r.end();
    });
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
    if (actual === expected) { pass++; console.log(`  PASS: ${name}`); }
    else { fail++; console.log(`  FAIL: ${name} (expected ${expected}, got ${actual})`); }
}

async function run() {
    console.log("=== SETUP: Register 2 users ===");
    const ts = Date.now();
    let r = await req("POST", "/api/auth/register", {
        username: `alice${ts}`, name: "Alice", age: 25, email: `alice${ts}@test.com`, password: "pass1234"
    });
    check("Register alice", r.status, 201);
    const aliceCookie = r.cookie ? r.cookie[0] : null;

    r = await req("POST", "/api/auth/register", {
        username: `bob${ts}`, name: "Bob", age: 30, email: `bob${ts}@test.com`, password: "pass1234"
    });
    check("Register bob", r.status, 201);
    const bobCookie = r.cookie ? r.cookie[0] : null;

    r = await req("GET", "/api/auth/me", null, aliceCookie);
    const aliceId = JSON.parse(r.data).user._id;

    r = await req("GET", "/api/auth/me", null, bobCookie);
    const bobId = JSON.parse(r.data).user._id;

    console.log("\n=== M2: PROFILE ===");

    r = await req("GET", `/api/profile/${aliceId}`, null, aliceCookie);
    check("Get own profile", r.status, 200);
    const profile = JSON.parse(r.data).profile;
    check("Profile has followersCount", profile.hasOwnProperty("followersCount"), true);
    check("Profile has postsCount", profile.hasOwnProperty("postsCount"), true);
    check("Profile no password", r.data.includes("password"), false);
    check("Profile no email leak", r.data.includes("alice2@test.com"), false);

    r = await req("GET", "/api/profile/507f1f77bcf86cd799439011", null, aliceCookie);
    check("Get nonexistent profile", r.status, 404);

    r = await req("GET", "/api/profile/invalid", null, aliceCookie);
    check("Get invalid profile ID", r.status, 400);

    r = await req("PUT", "/api/profile", { bio: "Hello, I am Alice!" }, aliceCookie);
    check("Update bio", r.status, 200);
    check("Bio updated", JSON.parse(r.data).user.bio, "Hello, I am Alice!");

    r = await req("PUT", "/api/profile", { name: "" }, aliceCookie);
    check("Update empty name", r.status, 400);

    r = await req("PUT", "/api/profile", { bio: "x".repeat(201) }, aliceCookie);
    check("Update long bio", r.status, 400);

    r = await req("PUT", "/api/profile", { isPrivate: true }, aliceCookie);
    check("Set private", r.status, 200);
    check("Is private", JSON.parse(r.data).user.isPrivate, true);

    r = await req("PUT", "/api/profile", { isPrivate: false }, aliceCookie);
    check("Set public", r.status, 200);

    console.log("\n=== M2: SEARCH USERS ===");

    r = await req("GET", `/api/profile/search?q=alice${ts}`, null, aliceCookie);
    check("Search users", r.status, 200);
    check("Found alice", JSON.parse(r.data).users.length > 0, true);

    r = await req("GET", "/api/profile/search?q=", null, aliceCookie);
    check("Empty search returns empty", JSON.parse(r.data).users.length, 0);

    r = await req("GET", "/api/profile/search?q=nonexistent", null, aliceCookie);
    check("No results", JSON.parse(r.data).users.length, 0);

    console.log("\n=== M3: POST CRUD + HASHTAGS ===");

    r = await req("POST", "/api/posts", { content: "Hello world #test #social" }, aliceCookie);
    check("Create post with hashtags", r.status, 201);
    const postId = JSON.parse(r.data).post._id;
    const hashtags = JSON.parse(r.data).post.hashtags;
    check("Hashtags extracted", hashtags.length, 2);
    check("Hashtag lowercased", hashtags[0], "#test");

    r = await req("GET", `/api/posts/${postId}`, null, aliceCookie);
    check("Get post by ID", r.status, 200);
    check("Post detail has liked", JSON.parse(r.data).post.hasOwnProperty("liked"), true);

    r = await req("GET", "/api/posts/507f1f77bcf86cd799439011", null, aliceCookie);
    check("Get nonexistent post", r.status, 404);

    r = await req("PUT", `/api/posts/${postId}`, { content: "Edited #updated" }, aliceCookie);
    check("Edit own post", r.status, 200);
    check("Post edited", JSON.parse(r.data).post.content, "Edited #updated");
    check("Hashtags updated", JSON.parse(r.data).post.hashtags.length, 1);

    r = await req("PUT", `/api/posts/${postId}`, { content: "x" }, bobCookie);
    check("Edit other's post", r.status, 403);

    r = await req("PUT", "/api/posts/507f1f77bcf86cd799439011", { content: "x" }, aliceCookie);
    check("Edit nonexistent post", r.status, 404);

    console.log("\n=== M3: BOOKMARKS ===");

    r = await req("POST", `/api/posts/${postId}/bookmark`, null, aliceCookie);
    check("Bookmark post", r.status, 200);
    check("Bookmarked", JSON.parse(r.data).bookmarked, true);

    r = await req("GET", "/api/posts/bookmarks", null, aliceCookie);
    check("Get bookmarks", r.status, 200);
    check("Has bookmarked post", JSON.parse(r.data).posts.length > 0, true);

    r = await req("POST", `/api/posts/${postId}/bookmark`, null, aliceCookie);
    check("Unbookmark post", r.status, 200);
    check("Unbookmarked", JSON.parse(r.data).bookmarked, false);

    console.log("\n=== M3: SEARCH POSTS ===");

    r = await req("GET", "/api/posts/search?q=Edited", null, aliceCookie);
    check("Search posts", r.status, 200);
    check("Found post", JSON.parse(r.data).posts.length > 0, true);

    r = await req("GET", "/api/posts/search?hashtag=updated", null, aliceCookie);
    check("Search by hashtag", r.status, 200);
    check("Found by hashtag", JSON.parse(r.data).posts.length > 0, true);

    r = await req("GET", "/api/posts/search?q=", null, aliceCookie);
    check("Empty search", JSON.parse(r.data).posts.length, 0);

    console.log("\n=== M3: FOLLOW SYSTEM ===");

    r = await req("POST", `/api/users/${bobId}/follow`, null, aliceCookie);
    check("Alice follows Bob", r.status, 200);
    check("Following true", JSON.parse(r.data).following, true);

    r = await req("POST", `/api/users/${aliceId}/follow`, null, aliceCookie);
    check("Self-follow blocked", r.status, 400);

    r = await req("POST", `/api/users/${bobId}/follow`, null, aliceCookie);
    check("Unfollow", JSON.parse(r.data).following, false);

    r = await req("POST", `/api/users/${bobId}/follow`, null, aliceCookie);
    check("Re-follow", JSON.parse(r.data).following, true);

    r = await req("GET", `/api/users/${aliceId}/followers`, null, aliceCookie);
    check("Get followers", r.status, 200);

    r = await req("GET", `/api/users/${aliceId}/following`, null, aliceCookie);
    check("Get following", r.status, 200);

    console.log("\n=== M4: COMMENTS ===");

    r = await req("POST", `/api/posts/${postId}/comments`, { content: "Nice post!" }, aliceCookie);
    check("Create comment", r.status, 201);
    const commentId = JSON.parse(r.data).comment._id;

    r = await req("POST", `/api/posts/${postId}/comments`, { content: "" }, aliceCookie);
    check("Empty comment", r.status, 400);

    r = await req("POST", `/api/posts/${postId}/comments`,
        { content: "Reply", parentComment: commentId }, bobCookie);
    check("Create reply (depth 1)", r.status, 201);
    check("Reply depth", JSON.parse(r.data).comment.depth, 1);
    const replyId = JSON.parse(r.data).comment._id;

    r = await req("POST", `/api/posts/${postId}/comments`,
        { content: "Deep reply", parentComment: replyId }, bobCookie);
    check("Create nested reply (depth 2)", r.status, 201);
    const deepReplyId = JSON.parse(r.data).comment._id;

    r = await req("POST", `/api/posts/${postId}/comments`,
        { content: "Deeper", parentComment: deepReplyId }, aliceCookie);
    check("Create depth 3 reply", r.status, 201);

    r = await req("POST", `/api/posts/${postId}/comments`,
        { content: "Too deep", parentComment: JSON.parse(r.data).comment._id }, aliceCookie);
    check("Depth 4 blocked", r.status, 400);

    r = await req("GET", `/api/posts/${postId}/comments`, null, aliceCookie);
    check("Get comments", r.status, 200);
    const commentsData = JSON.parse(r.data);
    check("Has comments", commentsData.comments.length > 0, true);
    check("Has total", commentsData.hasOwnProperty("total"), true);
    check("First comment has replies", commentsData.comments[0].hasOwnProperty("replies"), true);

    r = await req("PUT", `/api/posts/${postId}/comments/${commentId}`, { content: "Updated!" }, aliceCookie);
    check("Edit own comment", r.status, 200);

    r = await req("PUT", `/api/posts/${postId}/comments/${commentId}`, { content: "x" }, bobCookie);
    check("Edit other's comment", r.status, 403);

    r = await req("PUT", `/api/posts/${postId}/comments/507f1f77bcf86cd799439011`, { content: "x" }, aliceCookie);
    check("Edit nonexistent comment", r.status, 404);

    r = await req("POST", `/api/posts/${postId}/comments/${commentId}/like`, null, aliceCookie);
    check("Like comment", r.status, 200);
    check("Comment liked", JSON.parse(r.data).liked, true);

    r = await req("POST", `/api/posts/${postId}/comments/${commentId}/like`, null, aliceCookie);
    check("Unlike comment", JSON.parse(r.data).liked, false);

    r = await req("DELETE", `/api/posts/${postId}/comments/${replyId}`, null, bobCookie);
    check("Delete comment with children", r.status, 200);

    r = await req("GET", `/api/posts/${postId}/comments`, null, aliceCookie);
    check("Replies deleted with parent", JSON.parse(r.data).total > 0, true);

    r = await req("DELETE", `/api/posts/${postId}/comments/${commentId}`, null, bobCookie);
    check("Delete other's comment", r.status, 403);

    console.log("\n=== M2: ACCOUNT DELETION ===");

    r = await req("POST", "/api/auth/register", {
        username: `temp${ts}`, name: "Temp", age: 20, email: `temp${ts}@test.com`, password: "pass1234"
    });
    check("Register temp user", r.status, 201);
    const tempCookie = r.cookie ? r.cookie[0] : null;

    r = await req("DELETE", "/api/profile?password=wrong", null, tempCookie);
    check("Delete wrong password", r.status, 400);

    r = await req("DELETE", "/api/profile", null, tempCookie);
    check("Delete no password", r.status, 400);

    r = await req("DELETE", "/api/profile?password=pass1234", null, tempCookie);
    check("Delete account", r.status, 200);

    r = await req("GET", "/api/auth/me", null, tempCookie);
    check("Session cleared after delete", r.status, 401);

    console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
    process.exit(fail > 0 ? 1 : 0);
}

run();
