# town.com clone notes (2026-08-01 run, clone at ~/Desktop/town-clone, port 3400)

## Where the content actually lives
- Every product-UI mock (wiki profile panels, Routines editor cards, output email/drafts/pipeline panels, TownTeams integration rows) is a config object in the compiled JS chunks. Grep all chunks for a visible string; the neighboring object has the complete dataset including carousel variants that screenshots never show. The townie registry (names + theme colors for Bud/Sunny/Cliff/Flip and friends) is also in a chunk; use its exact hex values.

## Motion, almost entirely CSS
- MutationObserver over a full real-wheel scroll recorded zero class mutations: the theme-flip-to-dark and title reveals are pure CSS (sticky sections + static dark `html` background). The only JS-driven motion is the hero photo 5s opacity crossfade.
- Duplicate h2 text in the DOM is responsive variants (`md:hidden` / `hidden md:block`); the real heading is `sr-only`.
- Routines section entrance stagger: editor card 0s, output panel 0.22s, `cubic-bezier(0.16, 1, 0.3, 1)`, 0.65s, rise from 16px below with 0.985 scale; carousel switches variants every 7s.

## The floating ask bar, full spec
- Body-level fixed container from frame 0 (`fixed right-0 bottom-0 w-full md:w-[390px]`); it only looks like part of the hero. Clone it as a React portal on body, never absolute inside the hero.
- Input 390px wide, 46px tall, 16px from bottom, centered; radius 6px, 1px border, #fdfdfc.
- "Ask X anything" label shows only at scrollY <= 24, fades in 200ms, follows the townie rotation.
- Handoff: when the to-do composer enters the viewport the whole bar slides down and hides (composer "catches" it, same width/shape); stays hidden while below; reappears when scrolled back above the composer. Single symmetric condition: visible iff the composer is still below the viewport.

## Structure facts
- One page-spanning `bg-milk` container holds banner (37px dark) + transparent nav + all content; nav is sticky within it, so it survives to the credits screen. The privacy dark section is a `sticky bottom-0` curtain aside that must live in a local container starting after TownTeams, or it pins from screen one.
- Routines row: thumb cards 120px, editor card 400px, output panel 400px, copy column 290px, row 1258px wide centered with 98px margins at 1454 viewport.
- Flex + `truncate` needs `min-w-0` on the flex child (wiki panel overflow bug).
