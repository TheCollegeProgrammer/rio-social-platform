const fs = require("fs");
const path = require("path");
const dirs = [
    "server/controllers", "server/routes", "server/models",
    "server/middleware", "server/config"
];
const root = "D:\\Web-Dev\\Backend\\project-1";
let over = 0;
dirs.forEach((d) => {
    const full = path.join(root, d);
    if (!fs.existsSync(full)) return;
    fs.readdirSync(full).forEach((f) => {
        if (!f.endsWith(".js")) return;
        const lines = fs.readFileSync(path.join(full, f), "utf8").split("\n").length;
        const flag = lines > 150 ? " OVER!" : "";
        if (lines > 150) over++;
        console.log(`${lines.toString().padStart(4)} ${d}/${f}${flag}`);
    });
});
const appLines = fs.readFileSync(path.join(root, "server/app.js"), "utf8").split("\n").length;
console.log(`${appLines.toString().padStart(4)} server/app.js${appLines > 150 ? " OVER!" : ""}`);
if (appLines > 150) over++;
console.log(`\nOver 150: ${over}`);
