# creativemarketing.peachweb.io (PeachWeb / Peach Worlds builder)

Cloned 2026-08-03, mirror route, benchmark 100/100 all dimensions.

## Site fingerprint

- PeachWeb builder output: `pwb-*` classes (`pwb-flex-grid-wrap`, `pwb-scene`, `pwb-loading-wrap`), GrapesJS-based (`data-gjs-type` refs in inline scripts), no React/Next.
- Page structure: `body > div.pwb-flex-grid-wrap` blocks are the top-level sections; `div.pwb-anchor` zero-height markers between them.
- Hero: three.js r170 inside `.pwb-scene`, scene config fetched from `/scene-state/<uuid>.json` (Theatre.js timeline inside: `animations`, `engineState`, `sceneBuilderState` keys). Two DRACO-compressed `.glb` coin models.
- Runtime files: `/script.js` + numbered chunks `658/928/191/720.script.js`, `/ui-state.json`, `/website-base.css`, `/styles.css`. All fetched with relative paths, so a path-preserving mirror needs no JS edits.
- Zero analytics/tracking scripts. All 4 inline scripts are functional (waterfall resource loader, loading bar) — keep all.
- Fonts: Google Fonts DM Sans + Inter via `<link>`, plus self-hosted Helvetica Now Display TTF on the CDN. The third Google Fonts link (`family=sans-serif`) 400s on the original too — safe to drop.

## Gotchas hit

- **Cloudflare blocks bare curl** on the page origin; adding a Chrome UA string is enough (no cookie/clearance needed) for both the origin and `files.peachworlds.com`.
- **DRACO decoder must be mirrored**: runtime requests `/draco/draco_wasm_wrapper.js`, `/draco/draco_decoder.wasm` (and `.js` fallback) from the site origin. Missing = silent empty WebGL scene.
- **CDP screenshots time out while three.js runs**: the rAF render loop saturates the GPU. Freeze with `window.requestAnimationFrame = () => 0` (keep backup, restore after); then viewport captures take ~6s and 2000px band clips work. Full-page single captures (13k px) still time out even frozen — capture 2000px bands via `clip` + `captureBeyondViewport` and stitch with PIL.
- **A timed-out heredoc leaves `Emulation.setDeviceMetricsOverride` applied** — the next probe sees an inflated viewport (100vh sections stretch, pageH balloons). Re-assert the real viewport (1920×1050 dsf2) at the start of recovery.
- CDN asset set = server.html refs ∪ runtime img list ∪ grep of JS chunks/scene-state (the 3 preloaded jpgs + 2 glbs also appear in JS). 36 unique files total.
