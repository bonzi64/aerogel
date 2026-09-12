const fs = require("fs");
const path = require("path");
const { flattenSelectors } = require("./flatten.js");

const THEME = path.join(__dirname, "..", "AerogelDarkFlat.theme.css");

function compounds(sel) {
    const out = [];
    let depth = 0, cur = "", comb = "";
    for (const ch of sel) {
        if (ch === "(" || ch === "[") depth++;
        if (ch === ")" || ch === "]") depth--;
        if (depth === 0 && (ch === " " || ch === ">" || ch === "+" || ch === "~")) {
            if (cur.trim()) { out.push({ text: cur.trim(), comb }); cur = ""; comb = ch === " " ? " " : ch; }
            else if (ch !== " ") comb = ch;
            continue;
        }
        cur += ch;
    }
    if (cur.trim()) out.push({ text: cur.trim(), comb });
    return out;
}

const render = (cs) => cs.map((c, i) => (i === 0 ? c.text : (c.comb === " " ? " " : ` ${c.comb} `) + c.text)).join("");

const probes = [];
const seen = new Set();
for (const sel of flattenSelectors(fs.readFileSync(THEME, "utf8"))) {
    const cs = compounds(sel);
    cs.forEach((c, i) => {
        for (const m of c.text.matchAll(/\[class\*="([^"]+)"\]/g)) {

            const probe = render(cs.slice(0, i + 1));
            const key = probe + " @@ " + m[1];
            if (seen.has(key)) return;
            seen.add(key);
            probes.push({ p: probe, f: m[1] });
        }
    });
}

const snippet = `/* Aerogel - what are these fragments, really?
 *
 * 1. open Discord, press Ctrl+Shift+I, go to Console
 * 2. paste this whole file and press Enter
 * 3. walk around the app - open a server, a DM, the member list, settings,
 *    the emoji picker, a modal, right-click a message. Each visit finds more.
 * 4. run  copy(aerogelProbe())  and paste the result back into the chat
 *
 * It only reads class names. Nothing is sent anywhere.
 */
(() => {
    const PROBES = ${JSON.stringify(probes)};
    const store = (window.__aerogel ||= {});
    let found = 0;
    const sweep = () => {
        for (const { p, f } of PROBES) {
            let els;
            try { els = document.querySelectorAll(p); } catch { continue; }
            for (const el of els) for (const c of el.classList) {
                if (!c.includes(f)) continue;
                const bag = (store[f] ||= {});
                if (!bag[c]) { bag[c] = 0; found++; }
                bag[c]++;
            }
        }
    };
    sweep();
    const timer = setInterval(sweep, 1500);
    window.aerogelStop = () => clearInterval(timer);
    window.aerogelProbe = () => JSON.stringify(store, null, 1);
    console.log("%cAerogel probe running", "font-weight:bold");
    console.log(\`${probes.length} probes, \${Object.keys(store).length} fragments seen so far.\`);
    console.log("Walk around the app, then run: copy(aerogelProbe())");
})();
`;

fs.writeFileSync(path.join(__dirname, "probe-snippet.js"), snippet, "utf8");
console.log(`probe-snippet.js: ${probes.length} sond, ${new Set(probes.map((x) => x.f)).size} fragmentów`);
