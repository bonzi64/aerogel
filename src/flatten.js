const fs = require("fs");
const csstree = require("css-tree");

function join(parents, sel) {
    if (!parents.length) return [sel];
    const out = [];
    for (const p of parents) out.push(sel.includes("&") ? sel.replace(/&/g, p) : `${p} ${sel}`);
    return out;
}

function flatten(css) {
    const ast = csstree.parse(css, { parseValue: false });
    const rows = [];
    const walk = (list, parents, at) => {
        list.forEach((node) => {
            if (node.type === "Atrule") {
                const label = "@" + node.name + (node.prelude ? " " + csstree.generate(node.prelude) : "");
                if (node.block) walk(node.block.children, parents, at.concat(label));
                return;
            }
            if (node.type !== "Rule") return;
            const sels = node.prelude.children.toArray().flatMap((s) => join(parents, csstree.generate(s)));
            const decls = [], kids = [];
            node.block.children.forEach((c) => {
                if (c.type === "Declaration") decls.push(csstree.generate(c));
                else kids.push(c);
            });
            if (decls.length) rows.push(`${at.join(" | ")} :: ${sels.join(",")} { ${decls.join("; ")} }`);
            if (kids.length) walk({ forEach: (f) => kids.forEach(f) }, sels, at);
        });
    };
    walk(ast.children, [], []);
    return rows;
}

module.exports = { flatten };

if (require.main === module) {
    const rows = flatten(fs.readFileSync(process.argv[2], "utf8"));
    if (process.argv[3]) fs.writeFileSync(process.argv[3], rows.join("\n") + "\n", "utf8");
    console.log(`${process.argv[2]}: ${rows.length} reguł po spłaszczeniu`);
}

function flattenSelectors(css) {
    const out = [];
    const ast = csstree.parse(css, { parseValue: false });
    const walk = (list, parents) => {
        list.forEach((node) => {
            if (node.type === "Atrule") { if (node.block) walk(node.block.children, parents); return; }
            if (node.type !== "Rule") return;
            const sels = node.prelude.children.toArray().flatMap((s) => join(parents, csstree.generate(s)));
            const kids = [];
            let declares = false;
            node.block.children.forEach((c) => { if (c.type === "Declaration") declares = true; else kids.push(c); });
            if (declares) out.push(...sels);
            if (kids.length) walk({ forEach: (f) => kids.forEach(f) }, sels);
        });
    };
    walk(ast.children, []);
    return out;
}
module.exports.flattenSelectors = flattenSelectors;

function splitSelectorList(text) {
    const out = [];
    let depth = 0, cur = "";
    for (const ch of text) {
        if (ch === "(" || ch === "[") depth++;
        else if (ch === ")" || ch === "]") depth--;
        if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
        cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}
module.exports.splitSelectorList = splitSelectorList;
