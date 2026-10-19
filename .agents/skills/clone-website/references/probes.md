# Probe library

Copy-paste ego-browser scripts for each phase of `clone-website`. All run as `ego-browser nodejs <<'EOF' ... EOF` via Bash. Replace `TARGET_URL`, selectors, and output paths per task. Each heredoc is self-contained: task-space state does not reliably survive across invocations, so start every script with `await taskSpaces.useOrCreate('reverse <site>')` (same name all session) and `await browser.openOrReuseTab(url, { wait: true, timeout: 30000 })`, even where the snippets below omit them for brevity. Write full JSON to files under `reference/` and print only counts and paths.

The canonical, validated implementations of the recurring probes live in `tools/` (see `tools/manifest.json`); import them instead of re-typing:

```bash
ego-browser nodejs <<'EOF'
const { captureStatic } = await import('/ABSOLUTE/PATH/TO/clone-website/tools/capture-static.js')
await taskSpaces.useOrCreate('reverse example.com')
console.log(JSON.stringify(await captureStatic({ page, browser }, { url: 'TARGET_URL', outDir: 'reference' })))
EOF
```

## Phase 1, Static capture

### DOM + section outline

```bash
ego-browser nodejs <<'EOF'
const fs = await import('node:fs')
await taskSpaces.useOrCreate('reverse recon')
await browser.openOrReuseTab('TARGET_URL', { wait: true, timeout: 30000 })

// freeze autoplay videos FIRST or later evaluates time out
await page.evaluate(() => {
  const freeze = () => document.querySelectorAll('video').forEach(v => v.pause())
  freeze(); setInterval(freeze, 400)
})

const html = await page.evaluate(() => document.documentElement.outerHTML)
fs.writeFileSync('reference/dom/full-page.html', html)

const outline = await page.evaluate(() =>
  Array.from(document.body.children).flatMap(el =>
    Array.from(el.querySelectorAll(':scope > section, :scope > div, :scope > header, :scope > footer, :scope > main, :scope > aside'))
      .concat([el])
  ).map(el => {
    const r = el.getBoundingClientRect()
    return { tag: el.tagName, cls: el.className?.toString().slice(0, 120), y: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) }
  }).filter(s => s.h > 40).sort((a, b) => a.y - b.y)
)
fs.writeFileSync('reference/dom/outline.json', JSON.stringify(outline, null, 2))
console.log(JSON.stringify({ htmlKB: Math.round(html.length / 1024), sections: outline.length }))
EOF
```

### CSS files + token grep

```bash
ego-browser nodejs <<'EOF'
const urls = await page.evaluate(() =>
  performance.getEntriesByType('resource').map(e => e.name).filter(u => /\.css(\?|$)/.test(u))
)
console.log(urls.join('\n'))
EOF
# then: curl each into reference/css/, and:
grep -hoE -- '--[a-z-]+:\s*[^;]+' reference/css/*.css | sort -u > reference/design-tokens.txt
grep -nE 'animation-timeline|view-timeline|scroll-timeline|@keyframes' reference/css/*.css > reference/scroll-animation-hits.txt
```

### Fonts (JS-injected @font-face)

```bash
ego-browser nodejs <<'EOF'
const fonts = await page.evaluate(() => {
  const files = performance.getEntriesByType('resource').map(e => e.name).filter(u => /\.(woff2?|ttf|otf)(\?|$)/.test(u))
  const loaded = Array.from(document.fonts).map(f => ({ family: f.family, weight: f.weight, style: f.style, status: f.status }))
  const faces = []
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules)
        if (rule instanceof CSSFontFaceRule)
          faces.push({ family: rule.style.getPropertyValue('font-family'), weight: rule.style.getPropertyValue('font-weight'), src: rule.style.getPropertyValue('src').slice(0, 300) })
    } catch (e) { /* cross-origin sheet */ }
  }
  return { files, loaded, faces }
})
console.log(JSON.stringify(fonts, null, 2))
EOF
# Download with --globoff (bracketed filenames break curl globbing):
# curl --globoff -o public/fonts/<name>.woff2 '<url>'
```

### Asset enumeration

```bash
ego-browser nodejs <<'EOF'
const assets = await page.evaluate(() => {
  const dec = u => { try { const p = new URL(u, location.href); return p.pathname === '/_next/image' ? decodeURIComponent(p.searchParams.get('url')) : u } catch { return u } }
  return {
    imgs: [...new Set(Array.from(document.querySelectorAll('img[src]')).map(i => dec(i.src)))],
    videos: [...new Set(Array.from(document.querySelectorAll('video source, video[src]')).map(v => v.src || v.getAttribute('src')))],
    bgs: [...new Set(Array.from(document.querySelectorAll('*')).map(el => getComputedStyle(el).backgroundImage).filter(b => b.includes('url(')))],
    inlineSvgs: document.querySelectorAll('svg').length,
  }
})
console.log(JSON.stringify(assets, null, 2))
EOF
```

### Full-page reference screenshot (the only trustworthy way)

```bash
ego-browser nodejs <<'EOF'
await page.evaluate(() => { scrollTo(0, 0); document.querySelectorAll('video').forEach(v => v.pause()) })
await page.waitForTimeout(800)
await page.screenshot({ path: 'reference/screenshots/full-page.png', fullPage: true })
console.log('done')
EOF
# then slice per section using outline.json coordinates:
python3 scripts/slice.py reference/screenshots/full-page.png reference/dom/outline.json reference/screenshots/
```

Never screenshot after a programmatic scroll, compositor animation layers drop from the capture (solid-color frames) even though `scrollY` and computed styles read correctly.

### Stateful-bar reset before any measurement

```bash
ego-browser nodejs <<'EOF'
await taskSpaces.useOrCreate('reverse example.com')
await browser.openOrReuseTab('TARGET_URL', { wait: true, timeout: 30000 })
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
await browser.openOrReuseTab('TARGET_URL', { wait: true, timeout: 30000 })  // reopen so the cleared state takes effect
await page.evaluate(() => scrollTo(0, 0))
await page.waitForTimeout(800)
// confirm the bar state before trusting any y coordinate:
console.log(await page.evaluate(() => document.querySelector('BANNER_SELECTOR')?.getBoundingClientRect().height))
EOF
```

### Mock content from compiled JS chunks

```bash
# list chunks
ego-browser nodejs <<'EOF'
console.log((await page.evaluate(() =>
  performance.getEntriesByType('resource').map(e => e.name).filter(u => /\/_next\/static\/chunks\/.*\.js/.test(u))
)).join('\n'))
EOF
# download all into reference/js/, then grep for a visible string from the mock:
grep -l 'Daily Client Summary' reference/js/*.js   # the config object next to the hit has the FULL dataset
```

## Phase 2, Motion & interaction reverse

### Runtime animation inventory (ground truth)

```bash
ego-browser nodejs <<'EOF'
const anims = await page.evaluate(() =>
  document.getAnimations({ subtree: true }).map(a => ({
    target: a.effect?.target?.tagName + '.' + (a.effect?.target?.className?.toString().slice(0, 80) || ''),
    timeline: a.timeline?.constructor?.name,            // ViewTimeline = scroll-driven, DocumentTimeline = time-driven
    range: [a.rangeStart, a.rangeEnd],
    keyframes: a.effect?.getKeyframes?.(),
    inlineVars: a.effect?.target?.getAttribute?.('style'), // per-element params like --parallax-from
  }))
)
console.log(JSON.stringify({ count: anims.length, anims }, null, 2))
EOF
```

### MutationObserver + real wheel scroll (catch JS-triggered effects)

```bash
ego-browser nodejs <<'EOF'
await page.evaluate(() => {
  window.__muts = []
  new MutationObserver(ms => ms.forEach(m =>
    window.__muts.push({ t: m.target.tagName, attr: m.attributeName, cls: m.target.className?.toString().slice(0, 80) })
  )).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'style', 'src'] })
})
const pageH = await page.evaluate(() => document.body.scrollHeight)
for (let y = 0; y < pageH; y += 400) {
  await page.mouse.wheel(0, 400)          // real wheel events, not scrollTo
  await page.waitForTimeout(120)
}
const muts = await page.evaluate(() => window.__muts)
console.log(JSON.stringify({ total: muts.length, sample: muts.slice(0, 40) }, null, 2))
// 0 mutations across the whole scroll = the effects are pure CSS (sticky + backgrounds)
EOF
```

### Multi-position state sampling (fixed/sticky state machines)

```bash
ego-browser nodejs <<'EOF'
const snap = sel => page.evaluate(s => {
  const el = document.querySelector(s); if (!el) return null
  const walk = n => ({
    tag: n.tagName, cls: n.className?.toString().slice(0, 60),
    rect: (r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))(n.getBoundingClientRect()),
    style: (c => ({ opacity: c.opacity, radius: c.borderRadius, bg: c.backgroundColor, shadow: c.boxShadow.slice(0, 60), pos: c.position }))(getComputedStyle(n)),
    kids: Array.from(n.children).map(walk),
  })
  return walk(el)
}, sel)

const depths = [0, 500, 1500, 3300, 7000]
const out = {}
for (const y of depths) {
  await page.evaluate(v => scrollTo(0, v), y)
  await page.evaluate(() => window.dispatchEvent(new Event('scroll'))) // background spaces don't dispatch scroll
  await page.waitForTimeout(600)
  out[y] = await snap('FIXED_BAR_SELECTOR')
}
console.log(JSON.stringify(out, null, 2))
// diff the snapshots between depths, the differences ARE the interaction spec
EOF
```

Also sample the **reverse direction** (deep → shallow): interactions are often asymmetric or hysteretic.

## Phase 4, Verification

### Same-probe geometry diff (run against BOTH urls, diff the JSON)

```bash
for URL in https://original.example http://localhost:3400; do
ego-browser nodejs <<EOF
await browser.openOrReuseTab('$URL', { wait: true, timeout: 30000 })
await page.evaluate(() => { document.querySelectorAll('video').forEach(v => v.pause()); scrollTo(0, 0) })
const data = await page.evaluate(() => {
  const probe = sel => { const el = document.querySelector(sel); if (!el) return null
    const r = el.getBoundingClientRect(), c = getComputedStyle(el)
    return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height),
             font: c.fontFamily.split(',')[0] + ' ' + c.fontSize + '/' + c.fontWeight,
             color: c.color, bg: c.backgroundColor, radius: c.borderRadius, pad: c.padding } }
  return { pageH: document.body.scrollHeight,
    hero_h1: probe('SECTION1_SELECTOR'), nav: probe('NAV_SELECTOR') /* ...one line per named element */ }
})
console.log(JSON.stringify(data, null, 2))
EOF
done
```

Converge to ±6px per element and <1% total page height error.

### Scroll-interaction assertion (probe-environment-safe)

```bash
ego-browser nodejs <<'EOF'
const state = async () => page.evaluate(() => ({
  scrollY, barVisible: !!document.querySelector('FLOATING_BAR')?.checkVisibility(),
  label: document.querySelector('BAR_LABEL')?.textContent ?? null,
}))
const go = async y => { await page.evaluate(v => scrollTo(0, v), y)
  await page.evaluate(() => window.dispatchEvent(new Event('scroll'))); await page.waitForTimeout(600) }

const results = {}
for (const y of [0, 60, 1500, 3300, 7000, 1500, 0]) { await go(y); results[`at_${y}_${Object.keys(results).length}`] = await state() }
console.log(JSON.stringify(results, null, 2))
// assert class/content flips, NOT computed animation values, transitions are frozen in this environment
EOF
```

### Animation assertion on the clone

Re-run the Phase 2 animation inventory against `localhost` and assert: same count, same timeline types, matching keyframes. Screenshots cannot verify animations here.

### Mock-content acceptance sweep

```bash
ego-browser nodejs <<'EOF'
const report = await page.evaluate(() =>
  Array.from(document.querySelectorAll('MOCK_CARD_SELECTORS')).map(el => ({
    cls: el.className.toString().slice(0, 60),
    textLen: el.innerText.trim().length,
    imgs: el.querySelectorAll('img, svg').length,
  }))
)
console.log(JSON.stringify(report, null, 2))
// any panel with textLen 0 and imgs 0 is a defect until the live original proves otherwise
EOF
```
