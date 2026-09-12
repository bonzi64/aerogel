const fs = require("fs");
const csstree = require("css-tree");

const MIN_RUN = Number(process.env.MIN_RUN || 3);

function spaceOut(sel) {
    let out = "", depth = 0, quote = null;
    for (let i = 0; i < sel.length; i++) {
        const c = sel[i];
        if (quote) { out += c; if (c === quote && sel[i - 1] !== "\\") quote = null; continue; }
        if (c === '"' || c === "'") { quote = c; out += c; continue; }
        if (c === "[" || c === "(") depth++;
        if (c === "]" || c === ")") depth--;
        if (depth === 0 && (c === ">" || c === "+" || c === "~")) { out = out.replace(/ +$/, "") + " " + c + " "; continue; }
        out += c;
    }
    return out.replace(/  +/g, " ").trim();
}

function strip(sel, prefix) {
    if (sel.startsWith("& ")) sel = sel.slice(2);
    if (!sel.startsWith(prefix)) return null;
    const rest = sel.slice(prefix.length);
    if (rest === "") return "&";
    const c = rest[0];
    if (c === " ") return "& " + rest.slice(1);
    if (c === ">" || c === "+" || c === "~") return "& " + rest;
    if (c === "[" || c === ":" || c === "." || c === "#") return "&" + rest;
    return null;
}

function reindent(raw, pad) {
    const lines = raw.replace(/^\n/, "").replace(/\n[ \t]*$/, "").split("\n");
    const widths = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
    const base = widths.length ? Math.min(...widths) : 0;
    return lines.map((l) => (l.trim() ? pad + l.slice(base) : "")).join("\n");
}

function nestFile(file, anchors) {
    let text = fs.readFileSync(file, "utf8");
    for (const anchor of anchors) {
        const prefix = `[class*="${anchor}"]`;
        for (;;) {
            const ast = csstree.parse(text, { positions: true, parseValue: false });
            const runs = [];
            const scan = (list, inRule) => {
                let run = [];
                const flush = () => { if (run.length >= MIN_RUN) runs.push({ run, inRule }); run = []; };
                list.forEach((node) => {
                    if (node.type === "Rule") {
                        const sels = node.prelude.children.toArray().map((s) => spaceOut(csstree.generate(s)));
                        const stripped = sels.map((s) => strip(s, prefix));
                        if (stripped.every((s) => s !== null)) { run.push({ node, stripped }); return; }
                    }
                    flush();
                    if (node.block) scan(node.block.children, node.type === "Rule");
                });
                flush();
            };
            scan(ast.children, false);
            if (!runs.length) break;

            runs.sort((a, b) => b.run.length - a.run.length);
            const { run, inRule } = runs[0];
            const start = run[0].node.loc.start.offset;
            const end = run[run.length - 1].node.loc.end.offset;
            const lineStart = text.lastIndexOf("\n", start - 1) + 1;
            const pad = text.slice(lineStart, start).match(/^[ \t]*/)[0];

            const body = run.map(({ node, stripped }) => {
                const raw = text.slice(node.block.loc.start.offset + 1, node.block.loc.end.offset - 1);
                const head = stripped.join(",\n" + pad + "    ");
                return `${pad}    ${head} {\n${reindent(raw, pad + "        ")}\n${pad}    }`;
            }).join("\n\n");

            const head = inRule ? `& ${prefix}` : prefix;
            text = text.slice(0, start) + `${head} {\n${body}\n${pad}}` + text.slice(end);
        }
    }
    return text;
}

const [file, ...anchors] = process.argv.slice(2);
fs.writeFileSync(file, nestFile(file, anchors), "utf8");
console.log(`${file}: zagnieżdżono ${anchors.join(", ")}`);
