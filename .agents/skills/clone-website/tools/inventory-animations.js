import fs from 'node:fs'

function boundedInteger(value, fallback, max) {
  const n = value === undefined ? fallback : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(max, Math.trunc(n)))
}

export async function inventoryAnimations(ctx, args = {}) {
  const maxAnimations = boundedInteger(args.maxAnimations, 200, 500)

  const inventory = await ctx.page.evaluate((limit) => {
    return document.getAnimations({ subtree: true }).slice(0, limit).map((a) => ({
      target:
        (a.effect?.target?.tagName || '?') +
        '.' +
        (a.effect?.target?.className?.toString().slice(0, 80) || ''),
      timeline: a.timeline?.constructor?.name || 'none',
      range: [a.rangeStart, a.rangeEnd],
      keyframes: a.effect?.getKeyframes?.() || [],
      inlineVars: a.effect?.target?.getAttribute?.('style') || null,
    }))
  }, maxAnimations)

  const byTimeline = {}
  for (const a of inventory) byTimeline[a.timeline] = (byTimeline[a.timeline] || 0) + 1
  const summary = { count: inventory.length, byTimeline }

  if (args.outPath) {
    fs.writeFileSync(args.outPath, JSON.stringify(inventory, null, 2))
    return { ...summary, outPath: args.outPath }
  }
  return { ...summary, animations: inventory }
}
