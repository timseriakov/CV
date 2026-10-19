function boundedInteger(value, fallback, max) {
  const n = value === undefined ? fallback : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(max, Math.trunc(n)))
}

const DEFAULT_DEPTHS = [0, 500, 1500, 3300, 7000]

export async function sampleScrollStates(ctx, args = {}) {
  const { selector } = args
  if (!selector) throw new Error('sampleScrollStates: selector is required')
  const settleMs = boundedInteger(args.settleMs, 600, 2000)
  const depths = Array.isArray(args.depths) && args.depths.length ? args.depths.map(Number) : DEFAULT_DEPTHS

  const snapshotAt = async (y) => {
    await ctx.page.evaluate((v) => scrollTo(0, v), y)
    // Background task spaces do not dispatch scroll events; drive the state machine manually.
    await ctx.page.evaluate(() => window.dispatchEvent(new Event('scroll')))
    await ctx.page.waitForTimeout(settleMs)
    return ctx.page.evaluate((sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const walk = (n, depth) => {
        const r = n.getBoundingClientRect()
        const c = getComputedStyle(n)
        return {
          tag: n.tagName,
          cls: (n.className?.toString() || '').slice(0, 60),
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          style: {
            opacity: c.opacity,
            radius: c.borderRadius,
            bg: c.backgroundColor,
            shadow: c.boxShadow.slice(0, 60),
            pos: c.position,
            display: c.display,
          },
          kids: depth < 6 ? Array.from(n.children).map((k) => walk(k, depth + 1)) : [],
        }
      }
      return { scrollY: window.scrollY, subtree: walk(el, 0) }
    }, selector)
  }

  const out = {}
  for (const y of depths) out['down_' + y] = await snapshotAt(y)
  for (const y of [...depths].reverse()) out['up_' + y] = await snapshotAt(y)

  const sampled = Object.values(out).filter(Boolean).length
  if (!sampled) {
    throw new Error('sampleScrollStates: selector matched nothing at any depth: ' + selector)
  }
  return out
}
