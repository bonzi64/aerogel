const fs = require("fs");
const path = require("path");
const { flattenSelectors, flatten, splitSelectorList } = require("./flatten.js");

function restated(css) {
    const seen = new Map();
    const out = [];
    for (const row of flatten(css)) {
        const m = row.match(/^(.*?) :: (.*?) \{ (.*) \}$/);
        if (!m) continue;
        const decls = m[3].split("; ").map((d) => d.trim()).filter(Boolean);
        for (const sel of splitSelectorList(m[2])) {
            const key = `${m[1]} :: ${sel}`;
            const prev = seen.get(key) || {};
            if (decls.length && decls.every((d) => prev[d.slice(0, d.indexOf(":"))] === d)) out.push(sel);
            for (const d of decls) prev[d.slice(0, d.indexOf(":"))] = d;
            seen.set(key, prev);
        }
    }
    return out;
}

const { matching } = require("./resolve.js");
const hits = (token) => matching(token).length;

const BUDGET = {
    total: 20,
    perSelector: 0.06,

    chain: 7,
    broad: 140,
    anchor: 12,
};

const TOKENS = /\[class\*="([^"]+)"\]/g;

function chainDepth(sel) {
    let depth = 0, steps = 0, i = 0;
    while (i < sel.length) {
        if (sel[i] === "(") { depth++; i++; continue; }
        if (sel[i] === ")") { depth--; i++; continue; }
        if (depth === 0 && sel.startsWith('[class*="', i)) { steps++; i = sel.indexOf("]", i) + 1; continue; }
        if (depth === 0 && /^:(is|not|has|where)\(/.test(sel.slice(i))) {
            const open = sel.indexOf("(", i);
            let d = 0, j = open;
            for (; j < sel.length; j++) { if (sel[j] === "(") d++; else if (sel[j] === ")") { d--; if (!d) break; } }
            if (sel.slice(open, j).includes('[class*="')) steps++;
            i = j + 1;
            continue;
        }
        i++;
    }
    return steps;
}

function lint(css, name) {
    const selectors = flattenSelectors(css);
    const problems = [];
    let partial = 0;

    for (const sel of selectors) {
        const tokens = [...sel.matchAll(TOKENS)].map((m) => m[1]);
        partial += tokens.length;
        const short = sel.length > 92 ? sel.slice(0, 92) + "…" : sel;

        for (const t of tokens) {
            if (/^[a-f0-9]{5,6}$/.test(t)) problems.push(`hash-keyed [class*="${t}"] - breaks on Discord's next build: ${short}`);
            if (hits(t) === 0) problems.push(`[class*="${t}"] matches nothing in Discord: ${short}`);
        }
        const depth = chainDepth(sel);
        if (depth > BUDGET.chain) problems.push(`${depth} tree walks in one selector: ${short}`);

        const bare = sel.replace(/\[[^\]]*\]/g, "");
        const staticAnchor = /(^|[\s>+~(])[.#][A-Za-z_-]/.test(bare);
        const strongest = staticAnchor ? 0 : (tokens.length ? Math.min(...tokens.map(hits)) : Infinity);
        const broad = tokens.filter((t) => hits(t) > BUDGET.broad);
        if (broad.length && strongest > BUDGET.anchor)
            problems.push(`unanchored broad token [class*="${broad[0]}"] (${hits(broad[0])} classes): ${short}`);

        if (/ \* /.test(" " + bare + " ") && strongest > 1)
            problems.push(`universal descendant '*' with no exact anchor: ${short}`);
    }

    for (const sel of restated(css))
        problems.push(`rule restates an earlier one with the same selector, so it does nothing: ${sel.slice(0, 92)}`);

    const mean = partial / selectors.length;
    if (partial > BUDGET.total) problems.push(`${partial} partial matches in the file, budget is ${BUDGET.total}`);
    return { name, count: selectors.length, partial, mean, problems, ok: mean <= BUDGET.perSelector && !problems.length };
}

module.exports = { lint, BUDGET };

if (require.main === module) {
    const args = process.argv.slice(2);
    const files = args.length ? args
        : fs.readdirSync(path.join(__dirname, "..")).filter((f) => f.endsWith(".theme.css"))
            .map((f) => path.join(__dirname, "..", f));
    let bad = false;
    for (const f of files) {
        const r = lint(fs.readFileSync(f, "utf8"), path.basename(f));
        console.log(`\n${r.name}  ${r.partial} partial / ${r.count} selectors = ${r.mean.toFixed(2)}  [${r.ok ? "OK" : "OVER BUDGET"}]`);
        const uniq = [...new Set(r.problems)];
        for (const p of uniq.slice(0, 10)) console.log(`   - ${p}`);
        if (uniq.length > 10) console.log(`   … +${uniq.length - 10} more`);
        if (!r.ok) bad = true;
    }
    process.exit(bad ? 1 : 0);
}
