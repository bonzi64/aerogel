# Aerogel

Aerogel is the lightest solid ever made. It is almost entirely air, it scatters light into a soft haze, and the people who make it call it frozen smoke.

This is a Discord theme built on that idea. The app becomes a deep matte frame, and everything you actually read sits on a floating pane of frosted glass above it: the channel list, the chat, the member list and the user panel are separate tiles with their own hairline and their own shadow, not one flat wall of grey.

Seven builds ship from one shared rule set, so they all behave the same and break the same way when Discord changes something.

**[Open the live preview](https://bonzi64.github.io/aerogel/)** to switch between all seven builds and try the sliding server rail before you install anything. The preview page wears whichever build you select, so it is the theme rendering itself.

## Builds

| File | What it is | Use it when |
| --- | --- | --- |
| `AerogelDark.theme.css` | The reference build. Matte black frame, frosted panels, slow aurora behind the glass. | Default choice. |
| `AerogelLight.theme.css` | The same layout with the material inverted: white glass over a soft daylight frame, depth from dark ink instead of white film. | You work in a bright room. |
| `AerogelViolet.theme.css` | Matte black with an amethyst cast. Violet accents, violet sheen on every pane. Built for 505h. | You want the purple one. |
| `AerogelLightPink.theme.css` | Daylight with a blush cast: white glass over a soft pink frame, rose accents and plum shading instead of navy. | You want the pink one. |
| `AerogelDarkFlat.theme.css` | Dark with no blur, no animation, no soft shadows and opaque panels. | Weak GPU, old laptop, remote desktop, battery. |
| `AerogelLightFlat.theme.css` | The same treatment applied to the light build. | Bright room and a weak GPU. |
| `AerogelLightPinkFlat.theme.css` | The same treatment applied to the pink build. | Pink and a weak GPU. |

The two Flat builds are called Flat rather than Lite so that "Light" and "Lite" never appear in the same sentence. They are not a reduced feature set: the layout, the drawer and the controls are identical, they just stop paying for effects.

## What the theme changes

- **Floating panels.** Channel list, chat, members and the user panel are separate tiles with a gap between them, a bright hairline and a specular highlight along the top edge.
- **Auto-hiding server rail.** The server column collapses to a 14 px handle and slides out when you touch it or tab into it. The freed width goes to the channel list. One token turns it off.
- **macOS window controls.** Discord's own window buttons are repainted as red, yellow and green dots. They still close, minimise and maximise, and they show their glyphs when you hover the group. They stay top right, where Windows puts them.
- **Matte frame.** A deep radial gradient with a slow aurora drifting behind the glass and a layer of film grain over it. Both are single tokens and both can be set to zero.
- **Chat bar lifted off the edge**, message rows that rise 1 px on hover, rounded embeds and attachments, reaction pills, overlay scrollbars that only appear while you are in the scroller.

## Install

Only enable one build at a time. Two of them loaded together will fight over the same elements.

### Vencord

1. Open Discord, go to **Settings → Themes**, click **Open Themes Folder**.
2. Drop the `.theme.css` file you want into that folder. On Windows it is `%APPDATA%\Vencord\themes`.
3. Back in **Settings → Themes**, tick the theme.

Vencord reloads the file whenever it changes on disk, so you can keep it open in an editor and see edits land immediately.

### BetterDiscord

1. **Settings → Themes → Open Themes Folder**, or `%APPDATA%\BetterDiscord\themes` on Windows.
2. Drop the file in and enable it in the same panel.

### Requirements

The three frosted builds need `backdrop-filter`, which any current Discord desktop client and any Chromium browser supports. The Flat builds do not use it at all and will render correctly anywhere.

## Customising

Every build opens with a `:root` block. Edit the values there and save; there is nothing to compile.

| Token | Does |
| --- | --- |
| `--gmd-accent` | Accent colour: pills, selected channel, links, filled buttons. |
| `--gmd-accent-rgb` | The same colour as `r, g, b`. Used for translucent states, so change it together with the one above. |
| `--gmd-bg` | The frame behind the glass. Any gradient or flat colour. |
| `--gmd-aurora` | Strength of the drifting glow, `0` to `1`. `0` removes it. |
| `--gmd-grain` | Film grain opacity. `0` removes it. |
| `--gmd-panel-gap` | Gap between the floating tiles. |
| `--gmd-panel-radius` | Corner radius of the tiles. |
| `--gmd-panel-blur` | Frosting strength. Higher costs more GPU. |
| `--gmd-guildbar-autohide` | `1` for the sliding drawer, `0` for a fixed column. |
| `--gmd-guildbar-peek` | Width of the handle left behind when the drawer is parked. |
| `--gmd-guildbar-delay` | Grace period before the drawer hides again. |
| `--gmd-nameplate` | `1` keeps Nitro nameplate artwork, `0` hides it. |
| `--gmd-font` | UI font stack. |

### Recipes

Pin the server list open:

```css
--gmd-guildbar-autohide: 0;
```

Give the drawer a wider grab area and a longer grace period:

```css
--gmd-guildbar-peek: 22px;
--gmd-guildbar-delay: 450ms;
```

Switch the accent to a green, both tokens together:

```css
--gmd-accent: #2ecc8f;
--gmd-accent-rgb: 46, 204, 143;
```

Kill the ambient effects without leaving the frosted build:

```css
--gmd-aurora: 0;
--gmd-grain: 0;
```

Use a wallpaper as the frame:

```css
--gmd-bg: url("file:///C:/path/to/image.png") center / cover no-repeat fixed;
```

## Surviving Discord updates

Discord ships class names with a hash on the end, such as `sidebarList__5e434`, and rotates those hashes without warning. The sources never mention a hash — they are written against the stable fragment:

```css
[class*="sidebarList_"] { ... }
```

The **built** files do name the hash, because `[class*="sidebarList_"]` and `.sidebarList__5e434` select the same elements and the second is far cheaper. `resolve.js` does that substitution at build time, writing each fragment out as the classes it actually matches:

```css
[class*="sidebarList_"]  ->  .sidebarList__5e434
[class*="panels_"]       ->  :is(.panels__5e434, .panels_b292bc)
```

An attribute selector, a class, and `:is()` over classes all weigh `(0,1,0)`, so nothing in the cascade moves.

A fragment ending in `_` is read as a **component name**, not a substring: `form_` means the class called `form`, not every class with "form" in it. Reading it as a substring is what used to make the theme paint voice-message waveforms (`waveform_`), loading spinners (`inner_` → `loadingSpinner_`) and the video player (`layer_` → `clipsPlayer_`). A fragment written without the trailing `_`, such as `categoryItem`, is still a substring, because that is how it was meant.

A fragment naming more classes than `RESOLVE_MAX` (140) stays a fragment. One does: `container_`, which 338 separate Discord modules each define. In any given rule it is one of them, but only the running client knows which — `node probe.js` writes a console snippet that asks it.

**The trade this makes.** Naming hashes is what every approved theme does, and it is why they score near zero on wildcards — but it is also why they rot. Of the classes ClearVision and Azurite currently name, **41% and 45% no longer exist in Discord at all**: those rules stopped doing anything and nobody noticed. Aerogel is exposed to the same rot, with one difference — the hashes live only in build output, so recovering is:

```sh
npm run classes && npm run build
```

Nothing is edited by hand. The linter also fails the build on any fragment that matches nothing, so a component Discord *renames* is reported rather than silently dropped.

### Selector budget

A partial match is not free. The browser tests it against every element it
considers, and a fragment that is too short quietly matches components the
theme never meant to touch — `[class*="form_"]` also catches `waveform_`,
`[class*="layer_"]` also catches `clipsPlayer_`. BetterDiscord's
[performance guide](https://docs.betterdiscord.app/themes/concepts/performance)
asks for exact matches over wildcards for exactly this reason.

So every fragment here is checked against the real class list before it is
used, and the build refuses to finish if the file drifts:

```sh
npm run classes      # refresh src/discord-classes.txt from Discord's CSS
node classes.js form_            # what that fragment really matches
node classes.js --module 37e49   # every class from one Discord source file
```

`discord-classes.txt` holds every hashed class name Discord ships (~12k).
Classes sharing a hash come from one source file, so `--module` is the fastest
way to find a precise neighbour when a fragment turns out to be too broad.

The rules the build enforces:

- a fragment matching many components needs a narrow one scoping it;
- no selector keyed on a module hash — those break on Discord's next build;
- no fragment that matches nothing (a dead rule is a rule that stopped working);
- no `*` descendant unless its anchor names exactly one class;
- no rule that restates what an earlier rule with the same selector already set;
- a ceiling on partial matches for the whole file, measured after nesting is
  expanded. The ceiling is on the **total**, not the average: merging two
  selectors into one lowers the count and the divisor together, so an average
  can be improved by consolidation alone.

Repeated scopes are written with CSS nesting, so the anchor appears once:

```css
[class*="panels_"] {
    & [class*="buttons_"] { ... }
    & [class*="avatar_"]  { ... }
}
```

This is presentation, not a shortcut — the browser matches the same selectors
either way, and the budget above is measured on the expanded form. Nesting
needs Chrome 112, below what the theme already requires for `@container
style()` (Chrome 111).

Two structural facts the theme depends on, in case they change:

- The user panel is positioned over the bottom of the channel list, so the channel list is shortened to make room. If the panel ever stops overlapping, that shortening becomes a visible gap.
- The Nitro nameplate is a `div[aria-hidden="true"]` with an inline background gradient inside the account container. The theme removes that inline plate and keeps the artwork.

## Building from source

The seven files are generated, not maintained by hand. The rules live once and every build is a token set plus mechanical passes.

```
src/
  tokens-dark.css        palette and Discord variable remap for the dark build
  tokens-light.css       same, inverted for daylight
  tokens-violet.css      same, amethyst
  tokens-pink.css        same, blush daylight with a plum ink
  rules-1-frame.css      shells, panels, server rail, channel list, user panel
  rules-2-chat.css       title bar, chat bar, messages
  rules-3-overlays.css   popouts, profiles, pickers, settings, scrollbars
  patch-light.css        surfaces that must stay bright on a light frame
  patch-flat.css         whole-page effects removed for the Flat builds
  build.js               applies the passes and writes the seven theme files
  resolve.js             writes each fragment out as the classes it matches
  lint.js                selector budget; the build fails if a file exceeds it
  flatten.js             expands nesting, so rules are judged as a browser sees them
  classes.js             query the class list by fragment or by module hash
  fetch-classes.js       rebuild discord-classes.txt from Discord's stylesheets
  discord-classes.txt    every hashed class Discord ships, used to check fragments
```

Five more are one-shot cleanup tools rather than part of the build. They
print what they would change and only touch files when passed `--apply`:

```
  where.js               where the wildcards sit - as scope, or as target
  probe.js               writes a DevTools snippet that asks the live client
                         which class a fragment means in a given rule
  redundant.js           ancestors made pointless by a unique fragment downstream
  factor.js              selectors in one rule that share a prefix, folded into :is()
  factor-tail.js         ... and the mirror, for a shared trailing run
  noop.js                rules that restate what an identical selector already set
  nest.js / unnest.js    fold a repeated scope into nesting, and back out again
```

`unnest.js` matters more than it looks: selector work has to happen on whole
selectors, so the loop is unnest → edit → nest.

```sh
cd src
npm install
npm run build
```

`docs/index.html` is the preview page. GitHub Pages serves it if you set **Settings → Pages → Source** to `main` and the folder to `/docs`.

The passes are:

- **Tint.** Every literal white film in the rules is routed through `--gmd-tint-rgb`, so a build can decide whether depth is white, dark ink, amethyst or plum.
- **Reink.** `patch-light.css` is written in the light build's navy. A light variant with a different ink, such as the pink one, re-tints it, film-grain matrix included.
- **Soften.** Hard black shadows become soft ink shadows on the light builds.
- **Flat.** Zeroes every `backdrop-filter`, transition, animation and blur filter, and drops any shadow with a blur radius worth painting while keeping the hairline insets.

The script parses each output with `css-tree` and refuses to report success if anything fails to parse or if a file breaks the selector budget. `npm run lint` runs that check on its own and prints what tripped it.

## Known limits

- Enabling two builds at once produces a mess. Pick one.
- Plugins that restyle the same regions, particularly the server rail or the user panel, can conflict with the drawer.
- The theme forces its own palette regardless of the light or dark setting in Discord. That is deliberate: pick the build, not the setting.
- Animated nameplates are video. The Flat builds hide them to save a decode loop; set `--gmd-nameplate: 1` if you want them back.

## Licence

MIT. Use it, fork it, reskin it. Credit is welcome but not required.
