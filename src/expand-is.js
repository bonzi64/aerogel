const fs = require("fs");
const { flattenSelectors } = require("./flatten.js");

function split(inner) {
    const out = [];
    let depth = 0, cur = "";
    for (const ch of inner) {
        if (ch === "(" || ch === "[") depth++;
        if (ch === ")" || ch === "]") depth--;
        if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
        cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

function expand(sel) {
    const i = sel.indexOf(":is(");
    if (i === -1) return [sel];
    let depth = 0, j = i + 3;
    for (; j < sel.length; j++) {
        if (sel[j] === "(") depth++;
        else if (sel[j] === ")") { depth--; if (depth === 0) break; }
    }
    const head = sel.slice(0, i), tail = sel.slice(j + 1);
    return split(sel.slice(i + 4, j)).flatMap((arm) => expand(head + arm + tail));
}

const sels = flattenSelectors(fs.readFileSync(process.argv[2], "utf8"))
    .flatMap(expand)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .sort();
if (process.argv[3]) fs.writeFileSync(process.argv[3], sels.join("\n") + "\n", "utf8");
console.log(`${process.argv[2]}: ${sels.length} selektorów po rozwinięciu :is()`);
