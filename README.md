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
| `AerogelViolet.theme.css` | Matte black with an amethyst cast. Violet accents, violet sheen on every pane. | You want the purple one. |
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

Discord ships class names with a hash on the end, such as `sidebarList__5e434`, and rotates those hashes without warning. Aerogel never matches a full hashed name. Every selector matches the stable fragment instead:

```css
[class*="sidebarList_"] { ... }
```

That survives both hash styles Discord currently emits (`name_abc123` and `name__ab123`). When Discord renames the component itself rather than the hash, one section of the theme goes plain while everything else keeps working. If that happens, open DevTools, find the new fragment and replace the old one in `src/`.

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
```

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

The script parses each output with `css-tree` and refuses to report success if anything fails to parse.

## Known limits

- Enabling two builds at once produces a mess. Pick one.
- Plugins that restyle the same regions, particularly the server rail or the user panel, can conflict with the drawer.
- The theme forces its own palette regardless of the light or dark setting in Discord. That is deliberate: pick the build, not the setting.
- Animated nameplates are video. The Flat builds hide them to save a decode loop; set `--gmd-nameplate: 1` if you want them back.

## Support my work!

You can support my work here: https://tipply.pl/@bonzi64

## Licence

MIT. Use it, fork it, reskin it. Credit is welcome but not required.
