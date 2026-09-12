const fs = require("fs");
const path = require("path");
const classes = fs.readFileSync(path.join(__dirname, "discord-classes.txt"), "utf8").trim().split("\n");

const args = process.argv.slice(2);
if (!args.length) { console.error("usage: node classes.js <token> | --module <hash>"); process.exit(1); }

if (args[0] === "--module") {
    for (const h of args.slice(1)) {
        const mates = classes.filter((c) => c.endsWith("_" + h));
        console.log(`\n# module ${h}  (${mates.length})\n  ${mates.join(" ")}`);
    }
} else {
    for (const t of args) {
        const hits = classes.filter((c) => c.includes(t));
        const band = hits.length === 0 ? "MATCHES NOTHING" : hits.length === 1 ? "exact" : hits.length <= 3 ? "tight" : hits.length <= 12 ? "loose" : "NET";
        console.log(`\n[class*="${t}"] -> ${hits.length} classes  [${band}]`);
        console.log("  " + (hits.length > 30 ? hits.slice(0, 30).join(" ") + ` … +${hits.length - 30}` : hits.join(" ")));
    }
}
