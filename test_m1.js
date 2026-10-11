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
    const email = `m1${ts}@test.com`;
    const username = `m1${ts}`;

    console.log("=== HEALTH ===");
    let r = await req("GET", "/health");
    check("Health", r.status, 200);

    console.log("=== REGISTER ===");
    r = await req("POST", "/api/auth/register", { username, name: "M1", age: 25, email, password: "pass1234" });
    check("Register", r.status, 201);
    const cookie = r.cookie ? r.cookie[0] : null;

    r = await req("POST", "/api/auth/register", { username, name: "Dup", age: 25, email, password: "pass1234" });
    check("Duplicate email", r.status, 409);

    r = await req("POST", "/api/auth/register", { username: `x${ts}`, name: "Weak", age: 25, email: `x${ts}@t.com`, password: "123" });
    check("Weak password", r.status, 400);

    console.log("=== LOGIN ===");
    r = await req("POST", "/api/auth/login", { email, password: "pass1234" });
    check("Login", r.status, 200);
    const loginCookie = r.cookie ? r.cookie[0] : null;

    r = await req("POST", "/api/auth/login", { email, password: "wrongpass" });
    check("Wrong password", r.status, 401);

    r = await req("POST", "/api/auth/login", { email: "nobody@test.com", password: "pass1234" });
    check("No account", r.status, 401);

    console.log("=== ME ===");
    r = await req("GET", "/api/auth/me", null, loginCookie);
    check("Me", r.status, 200);
    const me = JSON.parse(r.data).user;
    check("No password leak", me.password, undefined);
    check("Correct user", me.username, username);

    r = await req("GET", "/api/auth/me");
    check("Me no cookie", r.status, 401);

    console.log("=== FORGOT/RESET PASSWORD ===");
    r = await req("POST", "/api/auth/forgot-password", { email });
    check("Forgot password", r.status, 200);

    r = await req("POST", "/api/auth/reset-password", { token: "invalidtoken", newPassword: "newpass123" });
    check("Invalid reset token", r.status, 400);

    console.log("=== CHANGE PASSWORD ===");
    r = await req("POST", "/api/auth/change-password", { currentPassword: "pass1234", newPassword: "newpass123" }, loginCookie);
    check("Change password", r.status, 200);

    r = await req("POST", "/api/auth/login", { email, password: "pass1234" });
    check("Old password rejected", r.status, 401);

    r = await req("POST", "/api/auth/login", { email, password: "newpass123" });
    check("New password works", r.status, 200);

    console.log("=== LOGOUT ===");
    r = await req("POST", "/api/auth/logout", null, loginCookie);
    check("Logout", r.status, 200);
    check("Cookie cleared", r.cookie && r.cookie[0].includes("token=;"), true);

    console.log(`\n=== M1 RESULTS: ${pass} passed, ${fail} failed ===`);
    process.exit(fail > 0 ? 1 : 0);
}

run();
