const fs = require("fs");
const csstree = require("css-tree");

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

const join = (parents, sel) =>
    !parents.length ? [sel]
        : parents.map((p) => (sel.includes("&") ? sel.replace(/&/g, p) : `${p} ${sel}`));

function dedent(raw, pad) {
    const lines = raw.replace(/^\n/, "").replace(/\n[ \t]*$/, "").split("\n");

    const rest = lines.slice(1).filter((l) => l.trim());
    const base = rest.length ? Math.min(...rest.map((l) => l.match(/^[ \t]*/)[0].length)) : 0;
    return lines.map((l, i) => (l.trim() ? pad + (i === 0 ? l.trim() : l.slice(base)) : "")).join("\n");
}

function unnest(file) {
    const text = fs.readFileSync(file, "utf8");
    const ast = csstree.parse(text, { positions: true, parseValue: false });
    const out = [];
    const COMMENT = /\/\*[\s\S]*?\*\//g;

    const gap = (from, to, pad) => {
        for (const m of text.slice(from, to).matchAll(COMMENT)) {
            const at = from + m.index;
            const col = at - (text.lastIndexOf("\n", at - 1) + 1);
            const lines = m[0].split("\n");
            out.push(lines.map((l, i) => (i === 0 ? pad + l : pad + l.slice(Math.min(col, l.match(/^[ \t]*/)[0].length)))).join("\n"));
            out.push("");
        }
    };;

    const emit = (list, parents, pad, startAt) => {
        let cursor = startAt;
        list.forEach((node) => {
            if (cursor !== null && node.loc) { gap(cursor, node.loc.start.offset, pad); cursor = node.loc.end.offset; }

            if (node.type === "Atrule") {
                const head = text.slice(node.loc.start.offset, node.block ? node.block.loc.start.offset : node.loc.end.offset).trim();
                if (!node.block) { out.push(pad + head); out.push(""); return; }
                out.push(pad + head.replace(/\s*$/, "") + " {");
                emit(node.block.children, parents, pad + "    ", node.block.loc.start.offset + 1);
                out.push(pad + "}");
                out.push("");
                return;
            }
            if (node.type !== "Rule") return;

            const sels = node.prelude.children.toArray()
                .flatMap((s) => join(parents, spaceOut(csstree.generate(s))));
            const decls = [], kids = [];
            node.block.children.forEach((c) => (c.type === "Declaration" ? decls : kids).push(c));

            if (decls.length) {
                const first = decls[0].loc.start.offset;
                const last = decls[decls.length - 1].loc.end.offset;
                const raw = text.slice(first, text[last] === ";" ? last + 1 : last);
                out.push(`${pad}${sels.join(",\n" + pad)} {`);
                out.push(dedent(raw, pad + "    "));
                out.push(`${pad}}`);
                out.push("");
            }
            if (kids.length) {
                const after = decls.length ? decls[decls.length - 1].loc.end.offset : node.block.loc.start.offset + 1;
                emit({ forEach: (f) => kids.forEach(f) }, sels, pad, after);
            }
        });
    };

    emit(ast.children, [], "", 0);
    return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
}

const file = process.argv[2];
fs.writeFileSync(file, unnest(file), "utf8");
console.log(`${file}: rozpakowano zagnieżdżenia`);
