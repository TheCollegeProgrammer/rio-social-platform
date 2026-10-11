const { spawn, execSync } = require("child_process");
const path = require("path");

const serverPath = path.join(__dirname, "server", "server.js");
const suites = ["test_m1.js", "test_m234.js", "test_m56.js", "test_images.js"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitHealthy = async () => {
    for (let i = 0; i < 30; i++) {
        try {
            execSync("node -e \"require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))\"", { stdio: "ignore" });
            return;
        } catch {
            await sleep(500);
        }
    }
    throw new Error("Server did not start");
};

let serverProc = null;

const startServer = () => {
    serverProc = spawn(process.execPath, [serverPath], {
        cwd: path.join(__dirname, "server"),
        env: { ...process.env, NODE_ENV: "test" },
        stdio: "ignore"
    });
};

const killServer = () => {
    if (serverProc && !serverProc.killed) {
        try {
            execSync(`taskkill /F /PID ${serverProc.pid}`, { stdio: "ignore" });
        } catch { }
        serverProc = null;
    }
};

async function run() {
    let failed = 0;

    for (const suite of suites) {
        killServer();
        await sleep(500);
        startServer();
        await waitHealthy();

        console.log(`\n########## ${suite} ##########`);
        try {
            execSync(`node "${path.join(__dirname, suite)}"`, { stdio: "inherit" });
        } catch (e) {
            failed++;
        }
    }

    killServer();
    console.log(`\n========== SUITES: ${suites.length - failed}/${suites.length} passed ==========`);
    process.exit(failed > 0 ? 1 : 0);
}

run();
