# landonorris.com clone learnings

Site type: Webflow (`data-wf-site="67b5a02dc5d338960b17a7e9"`) + OFF+BRAND custom layer. Cloned 2026-08-02 as raw-HTML mirror, benchmark 100/100 first run.

## Host map (mirror roots)

| Original host | Local root | Holds |
|---|---|---|
| cdn.prod.website-files.com | /wf | Webflow CSS, woff2 fonts, images, 2 JS bundles |
| lando.itsoffbrand.io | /ob | active WebGL bundle `dev-js/lando.OFF+BRAND.gold-android-fix-03.js` (1.3MB), draco decoder, GLB models (helmet-21, disco-02, tracks-05), HDRIs, texture sets, page-transition.riv |
| assets.itsoffbrand.io/lando | /oba/lando | 7 section .riv files, alternate dev-js (commented out) |
| d3e54v103j8qbb.cloudfront.net | /cf | jQuery, webflow badge svgs |
| unpkg.com | /unpkg | @rive-app/canvas-lite@2.26.4/rive.wasm |

Rewrite order matters: `assets.itsoffbrand.io/lando/gl` → `/ob/gl` BEFORE the general assets rule — the bundle carries both hosts as GL base-path variables pointing at the same tree.

## Gotchas hit

- **itsoffbrand.io blocks plain curl** (exit 56 recv failure). Needs `--http1.1 -A <Chrome UA> -e https://landonorris.com/`. website-files.com does not care.
- **Asset filename with space+parens** (`Britain-25 (1).webp`): naive `https://[^\s"]+` URL regex truncates at the space; the real href is `%20`-encoded in HTML. Grep the HTML for the file-id prefix to recover the true URL.
- **Script tags graveyard in head**: 3 of 4 custom bundles (`lando.OFF+BRAND.js`, `lando-by-OFF+BRAND.js`, `http://localhost:6645/app.js`) plus an alternate CSS hash are inside HTML comments. Only `gold-android-fix-03.js` is live. Regex script extraction without comment-awareness overcounts; check context before diagnosing "script didn't load".
- **Marquee duplication is IntersectionObserver-driven** (`data-marquee-duplicate="4"` etc., logic in the OFF+BRAND bundle, rootMargin 200px). It DOES fire in ego task spaces, but only on a *fresh* tab with the element scrolled into the viewport and ~1.5s idle; a tab that has been reloaded/probed repeatedly goes stale and the IO never fires again — looks like a clone defect but reproduces on the original. Always A/B on fresh tabs (`?probe-fresh=1`) before diagnosing.
- Settled state parity numbers: docH 13405, images 198/198, marquee scroll children [5,4], 21 canvases, fonts Brier 700 + Mona Sans Variable.
- Analytics to strip: GA loader inline + proxied gtag at `/avljl2rk9q5p.../...` + dataLayer inline, Klaviyo, iubenda (config + 2 loaders). All matched exactly once.
- Horizontal track section (`s.is-horizontal-track`) rests almost empty at scroll 0 (two photos top-right); that sparse look is correct, not a lazy-load defect.
