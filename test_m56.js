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
const check = (name, actual, expected) => {
    const ok = actual === expected;
    ok ? pass++ : fail++;
    console.log(`  ${ok ? "PASS" : "FAIL"}: ${name}${ok ? "" : ` (expected ${expected}, got ${actual})`}`);
};

async function run() {
    const ts = Date.now();

    console.log("=== SETUP ===");
    let r = await req("POST", "/api/auth/register", {
        username: `na${ts}`, name: "Alice", age: 25, email: `na${ts}@t.com`, password: "pass1234"
    });
    check("Register alice", r.status, 201);
    const aCookie = r.cookie ? r.cookie[0] : null;

    r = await req("POST", "/api/auth/register", {
        username: `nb${ts}`, name: "Bob", age: 25, email: `nb${ts}@t.com`, password: "pass1234"
    });
    check("Register bob", r.status, 201);
    const bCookie = r.cookie ? r.cookie[0] : null;

    r = await req("GET", "/api/auth/me", null, aCookie);
    const alice = JSON.parse(r.data).user;
    r = await req("GET", "/api/auth/me", null, bCookie);
    const bob = JSON.parse(r.data).user;

    console.log("=== NOTIFICATIONS ===");
    r = await req("GET", "/api/notifications", null, aCookie);
    check("Get notifications", r.status, 200);
    check("Has unreadCount", JSON.parse(r.data).hasOwnProperty("unreadCount"), true);

    r = await req("POST", "/api/posts", { content: "Hello #test" }, aCookie);
    check("Alice creates post", r.status, 201);
    const postId = JSON.parse(r.data).post._id;

    r = await req("POST", `/api/posts/${postId}/like`, null, bCookie);
    check("Bob likes post", r.status, 200);

    await new Promise((res) => setTimeout(res, 200));
    r = await req("GET", "/api/notifications", null, aCookie);
    let notifs = JSON.parse(r.data);
    check("Alice got like notification", notifs.notifications.length, 1);
    check("Notification type is like", notifs.notifications[0].type, "like");
    check("Unread count is 1", notifs.unreadCount, 1);

    r = await req("POST", `/api/posts/${postId}/comments`, { content: "Nice post!" }, bCookie);
    check("Bob comments", r.status, 201);

    await new Promise((res) => setTimeout(res, 200));
    r = await req("GET", "/api/notifications", null, aCookie);
    notifs = JSON.parse(r.data);
    check("Alice got comment notification", notifs.notifications.length, 2);

    const notifId = notifs.notifications.find((n) => n.type === "comment")._id;
    r = await req("PATCH", `/api/notifications/${notifId}/read`, null, aCookie);
    check("Mark one as read", r.status, 200);

    r = await req("GET", "/api/notifications", null, aCookie);
    check("Unread now 1", JSON.parse(r.data).unreadCount, 1);

    r = await req("PATCH", "/api/notifications/read-all", null, aCookie);
    check("Mark all read", r.status, 200);

    r = await req("GET", "/api/notifications", null, aCookie);
    check("Unread now 0", JSON.parse(r.data).unreadCount, 0);

    r = await req("POST", `/api/users/${alice._id}/follow`, null, bCookie);
    check("Bob follows alice", r.status, 200);

    await new Promise((res) => setTimeout(res, 200));
    r = await req("GET", "/api/notifications", null, aCookie);
    notifs = JSON.parse(r.data);
    check("Alice got follow notification", notifs.notifications.some((n) => n.type === "follow"), true);

    const followNotif = notifs.notifications.find((n) => n.type === "follow");
    r = await req("DELETE", `/api/notifications/${followNotif._id}`, null, aCookie);
    check("Delete notification", r.status, 200);

    r = await req("DELETE", "/api/notifications/507f1f77bcf86cd799439011", null, aCookie);
    check("Delete nonexistent notif", r.status, 404);

    r = await req("GET", "/api/notifications", null, bCookie);
    check("Bob has no notifications", JSON.parse(r.data).notifications.length, 0);

    r = await req("PATCH", `/api/notifications/${notifId}/read`, null, bCookie);
    check("Cannot read other's notification", r.status, 404);

    console.log("=== NOTIFICATIONS: no self-notif ===");
    r = await req("GET", "/api/notifications", null, aCookie);
    const beforeSelf = JSON.parse(r.data).notifications.length;
    r = await req("POST", `/api/posts/${postId}/like`, null, aCookie);
    check("Alice likes own post", r.status, 200);
    await new Promise((res) => setTimeout(res, 200));
    r = await req("GET", "/api/notifications", null, aCookie);
    check("No self-like notification", JSON.parse(r.data).notifications.length, beforeSelf);

    console.log("=== MESSAGING ===");
    r = await req("GET", "/api/messages", null, aCookie);
    check("Get conversations", r.status, 200);
    check("No conversations yet", JSON.parse(r.data).conversations.length, 0);

    r = await req("GET", `/api/messages/user/${alice._id}`, null, aCookie);
    check("Cannot message self", r.status, 400);

    r = await req("GET", `/api/messages/user/${bob._id}`, null, aCookie);
    check("Get/create conversation", r.status, 200);
    const convo = JSON.parse(r.data).conversation;
    check("Has 2 participants", convo.participants.length, 2);
    check("Populated participants", typeof convo.participants[0].username, "string");
    const convoId = convo._id;

    r = await req("GET", `/api/messages/user/${bob._id}`, null, aCookie);
    check("Same conversation reused", JSON.parse(r.data).conversation._id, convoId);

    r = await req("POST", `/api/messages/${convoId}/messages`, { content: "Hi Bob!" }, aCookie);
    check("Send message", r.status, 201);
    const msg = JSON.parse(r.data).data;
    check("Message content", msg.content, "Hi Bob!");

    r = await req("POST", `/api/messages/${convoId}/messages`, { content: "" }, aCookie);
    check("Empty message rejected", r.status, 400);

    r = await req("POST", `/api/messages/${convoId}/messages`, { content: "x" }, bCookie);
    check("Bob replies", r.status, 201);

    r = await req("GET", `/api/messages/${convoId}/messages`, null, aCookie);
    check("Get messages", r.status, 200);
    const msgs = JSON.parse(r.data);
    check("2 messages", msgs.messages.length, 2);
    check("Sorted oldest first", msgs.messages[0].content, "Hi Bob!");
    check("Total", msgs.total, 2);

    r = await req("POST", "/api/messages/507f1f77bcf86cd799439011/messages", { content: "x" }, aCookie);
    check("Nonexistent conversation", r.status, 404);

    r = await req("POST", `/api/messages/${convoId}/messages`, { content: "hack" }, null);
    check("Unauthenticated send", r.status, 401);

    r = await req("GET", "/api/messages", null, bCookie);
    check("Bob sees conversation", JSON.parse(r.data).conversations.length, 1);

    console.log("=== MESSAGING: unread tracking ===");
    r = await req("GET", "/api/messages/unread-count", null, bCookie);
    check("Bob unread count", JSON.parse(r.data).unreadCount, 1);

    r = await req("GET", "/api/messages", null, bCookie);
    check("Convo unreadCount field", JSON.parse(r.data).conversations[0].unreadCount, 1);

    r = await req("GET", "/api/messages/unread-count", null, aCookie);
    check("Alice unread count", JSON.parse(r.data).unreadCount, 1);

    r = await req("PATCH", `/api/messages/${convoId}/read`, null, bCookie);
    check("Mark conversation read", r.status, 200);

    r = await req("GET", "/api/messages/unread-count", null, bCookie);
    check("Bob unread now 0", JSON.parse(r.data).unreadCount, 0);

    r = await req("GET", "/api/messages", null, bCookie);
    check("Convo unread now 0", JSON.parse(r.data).conversations[0].unreadCount, 0);

    r = await req("POST", `/api/messages/${convoId}/messages`, { content: "one more" }, aCookie);
    check("Alice sends again", r.status, 201);

    r = await req("GET", "/api/messages/unread-count", null, bCookie);
    check("Bob unread incremented", JSON.parse(r.data).unreadCount, 1);

    r = await req("PATCH", "/api/messages/507f1f77bcf86cd799439011/read", null, bCookie);
    check("Read nonexistent convo", r.status, 404);

    console.log("=== MESSAGING: other user not in convo ===");
    r = await req("POST", "/api/auth/register", {
        username: `nc${ts}`, name: "Eve", age: 25, email: `nc${ts}@t.com`, password: "pass1234"
    });
    const cCookie = r.cookie ? r.cookie[0] : null;
    r = await req("GET", `/api/messages/${convoId}/messages`, null, cCookie);
    check("Stranger cannot read convo", r.status, 403);
    r = await req("POST", `/api/messages/${convoId}/messages`, { content: "hi" }, cCookie);
    check("Stranger cannot send", r.status, 403);
    r = await req("PATCH", `/api/messages/${convoId}/read`, null, cCookie);
    check("Stranger cannot mark read", r.status, 403);
    r = await req("GET", "/api/messages/unread-count", null, cCookie);
    check("Stranger unread count 0", JSON.parse(r.data).unreadCount, 0);

    console.log("=== IMAGE UPLOADS (validation) ===");
    r = await req("POST", "/api/upload/avatar", null, aCookie);
    check("Avatar no file", r.status, 400);

    r = await req("DELETE", "/api/upload/avatar", null, aCookie);
    check("Delete no avatar", r.status, 400);

    r = await req("DELETE", "/api/upload/bogus", null, aCookie);
    check("Invalid field", r.status, 400);

    r = await req("GET", "/uploads/nonexistent.png");
    check("Serve missing file", r.status, 404);

    console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
    process.exit(fail > 0 ? 1 : 0);
}

run();
