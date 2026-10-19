# arc.net clone notes (2026-08-01 run, clone at ~/Desktop/arc-net-clone, port 3411)

## Fonts, all JS-injected @font-face, invisible in saved HTML
- Marlin Soft SQ (Regular/Medium/ExtraBold): hero quote, feature titles, tweet wall
- Exposure VAR (variable, weights 650-900): Dia headline serif, both banner states
- ABC Oracle: Try Dia button
- All self-hosted on arc.net; discover via `document.fonts` + resource entries; download with `curl --globoff` (filenames contain brackets)

## Dia announcement banner, the signature interaction
- Expanded 617px, collapsed 122px "stamp" bar. Element state shifts every y on the page by ~495px between visits: reset localStorage before measuring anything.
- Collapsed stamp edge comes from `desktop-banner-mask.svg` (1202x122, exactly the collapsed height): the mask punches perforation teeth out of the glow background, whose edges are near-white, giving white teeth. The SVG must be applied with `preserveAspectRatio="none"` or it renders at intrinsic 1202px width and crops 126px per side no matter what mask-size says.
- Nav band is primary blue rgb(51,57,241) with a lighter #5057FF tooth strip hanging below it; over the collapsed stamp this gives the blue-teeth-over-white-teeth double row.
- Glow background `desktop-banner-bg.png` is a 1439x118 gradient strip; stretch it 100% x 100%, never tile.
- Collapse architecture that finally worked: constant 707px placeholder in flow (document height never changes), nav + expanded banner scroll away naturally 0-707px, past 707px a fixed stamp-bar + nav slides in (0.45s), re-expand within 40px of top. Anything that animates document height fights Chrome scroll anchoring and twitches; add `overflow-anchor: none` and wide hysteresis if unavoidable.

## Geometry facts
- Hero window container: min(1400px, viewport width), centered; hero image renders at 105% of container.
- Feature videos are 1440x960 full-bleed with the white matte baked into the frames; section titles overlap the video's baked matte via negative margins. Hero PNG carries transparent padding plus shadow. Element rects legitimately disagree with visual positions in both cases.
