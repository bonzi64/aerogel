const fs = require("fs");
const path = require("path");
const csstree = require("css-tree");
const { lint } = require("./lint.js");
const { resolveFragments } = require("./resolve.js");

const SRC = __dirname;
const OUT = path.resolve(SRC, "..");
const VERSION = "1.1.0";

const RESOLVE_MAX = Number(process.env.RESOLVE_MAX || 140);
const REPO = "https://github.com/bonzi64/aerogel";
const AUTHOR = "b0nzi64";
const AUTHOR_ID = "705825323446566933";

const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");
const body = ["rules-1-frame.css", "rules-2-chat.css", "rules-3-overlays.css"].map(read).join("");
const r3 = (n) => Math.round(n * 1000) / 1000;

function bareify(css) {
    const end = css.indexOf("*/") + 2;
    return css.slice(0, end) + "\n\n" + css.slice(end)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/[ \t]+$/gm, "")
        .replace(/\{\n{2,}/g, "{\n")
        .replace(/\n{2,}(\s*\})/g, "\n$1")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+/, "");
}

function meta(name, file, description) {
    return `/**
 * @name ${name}
 * @author ${AUTHOR}
 * @authorId ${AUTHOR_ID}
 * @version ${VERSION}
 * @description ${description}
 * @website ${REPO}
 * @source ${REPO}/raw/main/${file}
 */

`;
}

function setToken(css, name, value) {
    const re = new RegExp(`(\\n[ \\t]*${name.replace(/[-]/g, "\\-")}[ \\t]*:[ \\t]*)[^;]+;`);
    if (!re.test(css)) throw new Error(`token not found: ${name}`);
    return css.replace(re, `$1${value};`);
}

function setTokens(css, table) {
    for (const [k, v] of Object.entries(table)) css = setToken(css, k, v);
    return css;
}

function splitTop(value) {
    const out = [];
    let depth = 0, cur = "";
    for (const ch of value) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; }
        else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

function protectAtRules(css, store) {
    return css.replace(/@[\w-]+[^{;]*[{;]/g, (m) => {
        store.push(m);
        return `@__AT${store.length - 1}__ {`;
    });
}

function restoreAtRules(css, store) {
    return css.replace(/@__AT(\d+)__ \{/g, (m, i) => store[+i]);
}

const tint = (css) =>
    css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)/g,
        (m, a) => `rgba(var(--gmd-tint-rgb), ${parseFloat(a) === 0 ? 0 : r3(parseFloat(a))})`);

const INK_LIGHT = "26, 29, 44";
const INK_PINK = "74, 30, 52";

const softenShadows = (css, ink = INK_LIGHT) =>
    css.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)/g,
        (m, a) => `rgba(${ink}, ${r3(parseFloat(a) * 0.45)})`);

function reink(css, ink) {
    const [r, g, b] = ink.split(",").map((n) => (parseFloat(n) / 255).toFixed(2));
    return css
        .replace(/26,\s*29,\s*44/g, ink)
        .replace(/values='0 0 0 0 [\d.]+\s+0 0 0 0 [\d.]+\s+0 0 0 0 [\d.]+/,
            `values='0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}`);
}

function flatPass(css) {
    const imp = (v) => (/!important/.test(v) ? " !important" : "");
    const atRules = [];
    css = protectAtRules(css, atRules);

    css = css.replace(/(-webkit-)?backdrop-filter\s*:\s*([^;}]+)/g,
        (m, pfx, val) => `${pfx || ""}backdrop-filter: none${imp(val)}`);

    css = css.replace(/transition\s*:\s*([^;}]+)/g, (m, val) => `transition: none${imp(val)}`);
    css = css.replace(/animation\s*:\s*([^;}]+)/g, (m, val) => `animation: none${imp(val)}`);

    css = css.replace(/(^|[^-\w])filter\s*:\s*([^;}]+)/g, (m, pre, val) =>
        /blur\(|drop-shadow\(|saturate\(/.test(val) ? `${pre}filter: none${imp(val)}` : m);

    css = css.replace(/[\t ]*will-change\s*:\s*[^;}]+;?[\r\n]*/g, "");

    css = css.replace(/box-shadow\s*:\s*([^;}]+)/g, (m, val) => {
        const important = imp(val);
        const kept = splitTop(val.replace(/!important/g, "").trim()).filter((p) => {
            if (/inset/.test(p)) return true;
            return ![...p.matchAll(/([\d.]+)px/g)].some((x) => parseFloat(x[1]) >= 12);
        });
        return `box-shadow: ${kept.length ? kept.join(", ") : "none"}${important}`;
    });

    return restoreAtRules(css, atRules);
}

const FLAT_COMMON = {
    "--gmd-aurora": "0",
    "--gmd-grain": "0",
    "--gmd-panel-blur": "0px",
    "--gmd-panel-saturate": "100%",
    "--gmd-popout-blur": "0px",
    "--gmd-guildbar-autohide": "0",
    "--gmd-guildbar-speed": "0ms",
    "--gmd-guildbar-delay": "0ms",
    "--gmd-nameplate": "0",
    "--gmd-ease": "linear",
    "--gmd-fast": "0ms",
    "--gmd-med": "0ms",
    "--gmd-font": '"gg sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    "--gmd-font-code": '"gg mono", Consolas, "Courier New", monospace',
};

const FLAT_DARK = {
    ...FLAT_COMMON,
    "--gmd-bg": "linear-gradient(180deg, #15171f 0%, #0c0d12 100%)",
    "--gmd-panel-bg": "#181a23",
    "--gmd-panel-bg-flat": "#181a23",
    "--gmd-panel-nested-bg": "#1c1f29",
    "--gmd-panel-shadow": "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    "--gmd-panel-shadow-nested": "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    "--gmd-popout-bg": "#202430",
    "--gmd-popout-bg-solid": "#202430",
    "--gmd-popout-shadow": "0 0 0 1px rgba(0, 0, 0, 0.5)",
    "--gmd-chatbar-bg": "#1e212b",
    "--background-base-lowest": "#101219",
    "--background-base-lower": "#14161f",
    "--background-base-low": "#181a23",
    "--background-surface-high": "#1d202a",
    "--background-surface-higher": "#22252f",
    "--background-surface-highest": "#272a35",
    "--background-floating": "#202430",
    "--background-nested-floating": "#22252f",
    "--shadow-low": "0 0 0 1px rgba(0, 0, 0, 0.4)",
    "--shadow-medium": "0 0 0 1px rgba(0, 0, 0, 0.5)",
    "--shadow-high": "0 0 0 1px rgba(0, 0, 0, 0.6)",
    "--elevation-low": "0 0 0 1px rgba(0, 0, 0, 0.4)",
    "--elevation-medium": "0 0 0 1px rgba(0, 0, 0, 0.5)",
    "--elevation-high": "0 0 0 1px rgba(0, 0, 0, 0.6)",
    "--legacy-elevation-low": "0 0 0 1px rgba(0, 0, 0, 0.4)",
    "--legacy-elevation-high": "0 0 0 1px rgba(0, 0, 0, 0.6)",
};

const FLAT_LIGHT = {
    ...FLAT_COMMON,
    "--gmd-bg": "linear-gradient(180deg, #f4f7fd 0%, #e4e8f2 100%)",
    "--gmd-panel-bg": "#fafbff",
    "--gmd-panel-bg-flat": "#fafbff",
    "--gmd-panel-nested-bg": "#f2f5fc",
    "--gmd-panel-shadow": "inset 0 1px 0 #ffffff",
    "--gmd-panel-shadow-nested": "inset 0 1px 0 #ffffff",
    "--gmd-popout-bg": "#ffffff",
    "--gmd-popout-bg-solid": "#ffffff",
    "--gmd-popout-shadow": "0 0 0 1px rgba(26, 29, 44, 0.14)",
    "--gmd-chatbar-bg": "#ffffff",
    "--gmd-field-bg": "#ffffff",
    "--gmd-field-bg-hover": "#f3f5fb",
    "--background-base-lowest": "#fbfcff",
    "--background-base-lower": "#f7f9fe",
    "--background-base-low": "#f2f5fc",
    "--background-surface-high": "#ffffff",
    "--background-surface-higher": "#ffffff",
    "--background-floating": "#ffffff",
    "--background-nested-floating": "#ffffff",
    "--background-primary": "#fafbff",
    "--background-secondary": "#f4f7fd",
    "--background-secondary-alt": "#ffffff",
    "--background-tertiary": "#eef2fa",
    "--shadow-low": "0 0 0 1px rgba(26, 29, 44, 0.1)",
    "--shadow-medium": "0 0 0 1px rgba(26, 29, 44, 0.12)",
    "--shadow-high": "0 0 0 1px rgba(26, 29, 44, 0.14)",
    "--elevation-low": "0 0 0 1px rgba(26, 29, 44, 0.1)",
    "--elevation-medium": "0 0 0 1px rgba(26, 29, 44, 0.12)",
    "--elevation-high": "0 0 0 1px rgba(26, 29, 44, 0.14)",
    "--legacy-elevation-low": "0 0 0 1px rgba(26, 29, 44, 0.1)",
    "--legacy-elevation-high": "0 0 0 1px rgba(26, 29, 44, 0.14)",
};

const FLAT_PINK = {
    ...FLAT_COMMON,
    "--gmd-bg": "linear-gradient(180deg, #fdf2f7 0%, #f5dfe9 100%)",
    "--gmd-panel-bg": "#fffafc",
    "--gmd-panel-bg-flat": "#fffafc",
    "--gmd-panel-nested-bg": "#fdf3f7",
    "--gmd-panel-shadow": "inset 0 1px 0 #ffffff",
    "--gmd-panel-shadow-nested": "inset 0 1px 0 #ffffff",
    "--gmd-popout-bg": "#ffffff",
    "--gmd-popout-bg-solid": "#ffffff",
    "--gmd-popout-shadow": "0 0 0 1px rgba(74, 30, 52, 0.14)",
    "--gmd-chatbar-bg": "#ffffff",
    "--gmd-field-bg": "#ffffff",
    "--gmd-field-bg-hover": "#fdf3f7",
    "--background-base-lowest": "#fffbfd",
    "--background-base-lower": "#fdf7fa",
    "--background-base-low": "#fbf1f6",
    "--background-surface-high": "#ffffff",
    "--background-surface-higher": "#ffffff",
    "--background-floating": "#ffffff",
    "--background-nested-floating": "#ffffff",
    "--background-primary": "#fffafc",
    "--background-secondary": "#fdf2f7",
    "--background-secondary-alt": "#ffffff",
    "--background-tertiary": "#f9eaf1",
    "--shadow-low": "0 0 0 1px rgba(74, 30, 52, 0.1)",
    "--shadow-medium": "0 0 0 1px rgba(74, 30, 52, 0.12)",
    "--shadow-high": "0 0 0 1px rgba(74, 30, 52, 0.14)",
    "--elevation-low": "0 0 0 1px rgba(74, 30, 52, 0.1)",
    "--elevation-medium": "0 0 0 1px rgba(74, 30, 52, 0.12)",
    "--elevation-high": "0 0 0 1px rgba(74, 30, 52, 0.14)",
    "--legacy-elevation-low": "0 0 0 1px rgba(74, 30, 52, 0.1)",
    "--legacy-elevation-high": "0 0 0 1px rgba(74, 30, 52, 0.14)",
};

const dropWebfont = (css) => css.replace(/@import url\("https:\/\/fonts[^)]+\);\s*/g, "");

const headDark = () => read("tokens-dark.css");
const headLight = () => read("tokens-light.css");
const headViolet = () => read("tokens-violet.css");
const headPink = () => read("tokens-pink.css");

const variants = [
    {
        file: "AerogelDark.theme.css",
        name: "Aerogel Dark",
        description: "Matte dark theme with floating frosted panels, macOS window controls and an auto-hiding server rail.",
        build: () => headDark() + body,
    },
    {
        file: "AerogelLight.theme.css",
        name: "Aerogel Light",
        description: "Daylight Aerogel: white frosted panels over a soft matte frame, with the same panels, controls and server rail.",
        build: () => headLight() + softenShadows(tint(body)) + read("patch-light.css"),
    },
    {
        file: "AerogelViolet.theme.css",
        name: "Aerogel Violet",
        description: "Amethyst Aerogel: matte black frame, violet glass and accents. Built for 505h.",
        build: () => headViolet() + tint(body),
    },
    {
        file: "AerogelLightPink.theme.css",
        name: "Aerogel Light Pink",
        description: "Blush Aerogel: white frosted panels over a soft pink frame, rose accents and plum shading.",
        build: () => headPink() + softenShadows(tint(body), INK_PINK) + reink(read("patch-light.css"), INK_PINK),
    },
    {
        file: "AerogelDarkFlat.theme.css",
        name: "Aerogel Dark Flat",
        description: "Aerogel Dark with no blur, no animation and flat shadows. For weak GPUs, laptops and remote desktops.",
        build: () => dropWebfont(setTokens(headDark(), FLAT_DARK)) + flatPass(body) + read("patch-flat.css"),
    },
    {
        file: "AerogelLightFlat.theme.css",
        name: "Aerogel Light Flat",
        description: "Aerogel Light with no blur, no animation and flat shadows. For weak GPUs, laptops and remote desktops.",
        build: () => dropWebfont(setTokens(headLight(), FLAT_LIGHT)) +
            flatPass(softenShadows(tint(body)) + read("patch-light.css")) + read("patch-flat.css"),
    },
    {
        file: "AerogelLightPinkFlat.theme.css",
        name: "Aerogel Light Pink Flat",
        description: "Aerogel Light Pink with no blur, no animation and flat shadows. For weak GPUs, laptops and remote desktops.",
        build: () => dropWebfont(setTokens(headPink(), FLAT_PINK)) +
            flatPass(softenShadows(tint(body), INK_PINK) + reink(read("patch-light.css"), INK_PINK)) +
            read("patch-flat.css"),
    },
];

function countLive(css, prop) {
    const re = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;}]+)`, "g");
    let n = 0, m;
    while ((m = re.exec(css)) !== null) {
        if (m[1].replace(/!important/g, "").trim() !== "none") n++;
    }
    return n;
}

let failed = false;

for (const v of variants) {
    let css = meta(v.name, v.file, v.description) + v.build();
    css = bareify(css);

    const res = resolveFragments(css, RESOLVE_MAX);
    css = res.css;

    const errors = [];
    const ast = csstree.parse(css, { positions: true, onParseError: (e) => errors.push(`${e.message} @ ${e.line}:${e.column}`) });
    let rules = 0;
    csstree.walk(ast, { visit: "Rule", enter: () => rules++ });

    if (errors.length) failed = true;
    fs.writeFileSync(path.join(OUT, v.file), css, "utf8");

    const budget = lint(css, v.file);
    if (!budget.ok) failed = true;

    console.log(
        `${v.file.padEnd(28)} rules ${String(rules).padEnd(5)} ` +
        `blur ${String(countLive(css, "backdrop-filter")).padEnd(3)} ` +
        `anim ${String(countLive(css, "animation")).padEnd(3)} ` +
        `trans ${String(countLive(css, "transition")).padEnd(3)} ` +
        `wild ${budget.mean.toFixed(2)} ` +
        `klas ${String(res.written).padEnd(5)}` +
        `${(Buffer.byteLength(css, "utf8") / 1024).toFixed(1)}KB` +
        (errors.length ? `  PARSE ERRORS: ${errors.slice(0, 3).join("; ")}` : "")
    );

    for (const p of [...new Set(budget.problems)].slice(0, 5)) console.log(`    ! ${p}`);
}

console.log(failed ? "\nBUILD FAILED" : "\nall variants parsed clean and within the selector budget");
process.exitCode = failed ? 1 : 0;
