const fs = require("fs");
const path = require("path");

const CLASSES = fs.readFileSync(path.join(__dirname, "discord-classes.txt"), "utf8").trim().split("\n");

const baseName = (cls) => cls.replace(/__?[a-f0-9]{5,6}$/, "");

const cache = new Map();
function matching(fragment) {
    if (!cache.has(fragment)) {
        const hit = fragment.endsWith("_")
            ? CLASSES.filter((c) => baseName(c) === fragment.slice(0, -1))
            : CLASSES.filter((c) => c.includes(fragment));
        cache.set(fragment, hit);
    }
    return cache.get(fragment);
}

function resolveFragments(css, maxClasses) {
    let resolved = 0, left = 0, written = 0;
    const out = css.replace(/\[class\*="([^"]+)"\]/g, (whole, fragment) => {
        const list = matching(fragment);
        if (!list.length || list.length > maxClasses) { left++; return whole; }
        resolved++;
        written += list.length;
        return list.length === 1 ? `.${list[0]}` : `:is(${list.map((c) => "." + c).join(", ")})`;
    });
    return { css: out, resolved, left, written };
}

module.exports = { resolveFragments, matching };
