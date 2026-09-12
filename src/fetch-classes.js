const fs = require("fs");
const path = require("path");

const ORIGIN = "https://discord.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const OUT = path.join(__dirname, "discord-classes.txt");
const CONCURRENCY = 32;

const get = async (url) => {
    const r = await fetch(url, { headers: { "user-agent": UA } });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.text();
};

async function pool(items, worker) {
    const out = [];
    let i = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
        while (i < items.length) {
            const n = i++;
            try { out[n] = await worker(items[n]); } catch { out[n] = ""; }
        }
    }));
    return out;
}

(async () => {
    const shell = await get(`${ORIGIN}/app`);
    const chunks = new Set([...shell.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.css/g)].map((m) => m[0]));

    const runtime = shell.match(/\/assets\/web\.[A-Za-z0-9]+\.js/);
    if (runtime) {
        const js = await get(ORIGIN + runtime[0]);

        for (const m of js.matchAll(/"(\d+)"===e\?""\+e\+"\.([a-f0-9]{16})\.css"/g))
            chunks.add(`/assets/${m[1]}.${m[2]}.css`);

        const end = js.indexOf(')[e]+".css"');
        if (end !== -1) {
            let i = end, depth = 0;
            for (; i >= 0; i--) {
                if (js[i] === "}") depth++;
                else if (js[i] === "{") { depth--; if (depth === 0) break; }
            }
            for (const m of js.slice(i, end).matchAll(/(\d+):"([a-f0-9]{16})"/g))
                chunks.add(`/assets/${m[1]}.${m[2]}.css`);
        }
    }

    const list = [...chunks];
    console.log(`chunks CSS: ${list.length}`);
    const bodies = await pool(list, (p) => get(ORIGIN + p));

    const classes = new Set();
    for (const body of bodies)
        for (const m of body.matchAll(/\.([A-Za-z][A-Za-z0-9]*__?[a-f0-9]{5,6})\b/g)) classes.add(m[1]);

    const sorted = [...classes].sort();
    fs.writeFileSync(OUT, sorted.join("\n") + "\n", "utf8");
    console.log(`zapisano ${sorted.length} klas -> ${path.relative(process.cwd(), OUT)}`);
})();
