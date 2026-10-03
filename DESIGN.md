# KinderQuill design system — "Cosy Night-Light"

This is the contract for every screen. If a change contradicts a rule here, the rule wins
unless it is written down as an exception in this file.

Approved by Vivek on 2026-10-03 after three rounds of mockups. The world: a calm dusk, deep
indigo and plum grounds, one warm lamp cream surface for anything read or written, moon
white text, and **exactly one amber control per screen**.

## The palette

Never write a raw hex in a component. Use the Tailwind token or the CSS variable.

| Token | Hex | Used for |
|---|---|---|
| `kq-ink` | `#14122A` | deepest ground, outside the app frame |
| `kq-navy` | `#1B1D3A` | the app ground |
| `kq-navy-mid` | `#232247` | raised ground |
| `kq-plum` | `#3A2340` | the dusk end of a gradient |
| `kq-plum-soft` | `#4A2E4E` | secondary dusk |
| `kq-card` | `#232044` | card surface |
| `kq-cream` | `#F6E7C9` | the reading page, the one light surface |
| `kq-cream-dim` | `#E8D6B2` | cream shading |
| `kq-text` | `#F4F2EC` | moon white, primary text |
| `kq-dim` | `#A9A5CC` | secondary text |
| `kq-line` | `rgba(244,242,236,0.14)` | hairlines |
| `kq-amber` | `#E0A046` | **the single accent** |
| `kq-amber-dark` | `#B87C2E` | amber pressed state |
| `kq-amber-ink` | `#241A12` | text on amber |

Tailwind classes: `bg-kq-navy`, `text-kq-dim`, `border-kq-line`, `text-kq-amber`, and so on.
In CSS: `var(--kq-navy)`. The old accent names (`kq-sky`, `kq-mint`, `kq-coral`,
`kq-purple`, `kq-electric`) still resolve, but they are remapped to muted tones. **Do not
build anything new on them.** If you find one in a file you are editing, replace it.

## Type

- `font-display` or the `kq-hero-title` class — **Fraunces**. Headlines, book titles, page
  text, anything a child reads.
- `font-body` or nothing — **Inter** is the body default. Buttons, labels, menus, inputs,
  metadata, anything operated.
- Never set a font-family by hand. Never reference Fredoka One or Nunito; they are gone.

## Shape

Rounded rectangles, never capsules. `rounded` = 10px, `rounded-md` = 12px, `rounded-lg` =
14px, `rounded-xl` = 22px. A button is 14px. A card is 22px. **`rounded-full` on a control
is a bug.**

## The component classes (already in `app/globals.css`)

| Class | What it is |
|---|---|
| `.kq-ground` | the gradient app background |
| `.kq-ground-flat` | flat indigo background |
| `.kq-stars-bg` | the fixed star field overlay |
| `.kq-btn-primary` | **the one amber action.** Only one per screen. |
| `.kq-btn-secondary` | quiet action, hairline on the night |
| `.kq-card` | a card surface |
| `.kq-sheet` | the warm cream reading surface |
| `.kq-eyebrow` | small amber tracked label. Max one per three sections. |
| `.kq-input` | text field |
| `.kq-top-bar` | sticky translucent header |
| `.kq-icon-btn` | square icon control |
| `.kq-progress-bar` / `.kq-progress-fill` | progress |
| `.kq-toggle` (+ `.on`) | switch |
| `.kq-page-dot` (+ `.active`) | page indicator |
| `.kq-chip` (+ `.is-on`) | a chip, use for selectable options |
| `.kq-cover` | a book cover plate |
| `.kq-hero-media`, `.kq-scrim-top`, `.kq-scrim-bottom` | full bleed hero media and its scrims |

## Rules that get a screen rejected

1. **One amber action.** Everything else is a `.kq-btn-secondary`, a text link, or a chip.
2. **No inventing numbers.** No fake ratings, reviews, reader counts, percentages, prices.
   Real values only, and if a real value is ugly, it is still allowed to be ugly.
3. **No em dash, no en dash.** Anywhere. Use a full stop, a comma, a colon, or a hyphen.
4. **No emoji as UI.** Not in buttons, not in headings, not in labels. Use the icon set
   (`components/Icons.tsx`) or a Material Symbols span. Copy may still contain a real
   character's name.
5. **No neon, no outer glows, no pure black, no drop shadows for depth.** A hairline or a
   surface change instead.
6. **No pills.** See Shape.
7. **No lorem, no placeholder names.** Real copy from the product.
8. **Hero fits the first viewport**, headline at most two lines, one action visible.
9. **One layout family per section**, used once. No three identical cards in a row.
10. **No scroll cues, no section numbers as eyebrows, no decorative text strips.**

## Motion

- Animate `transform` and `opacity` only. Never `top`, `left`, `width`, `height`.
- Never `window.addEventListener('scroll', ...)`. Use IntersectionObserver.
- Nothing in a `requestAnimationFrame` loop may touch React state.
- Every animation collapses under `prefers-reduced-motion: reduce`. `globals.css` already
  does this globally; anything scripted must check the media query itself.
- A Three.js canvas is allowed only as a single canvas, capped pixel ratio, paused when off
  screen or hidden, disposed on unmount. Copy `components/NightLightBookScene.tsx`.

## Copy voice

Plain, warm, short. One idea per sentence. A parent reading at 9pm is the reader. Say what
happens, not how amazing it is.

## Non-negotiables about behaviour

**Every existing feature and route must survive the restyle.** In particular: `/generate`,
`/generating/[bookId]`, `/book/[bookId]`, `/library`, `/gallery`, `/ai-stories`,
`/video-studio`, `/parent`, `/pdf/[bookId]`, `/share/[bookId]`, `/privacy-policy`, and every
`/api/*` route. Keep every fetch call, every piece of state, every navigation, and the
localStorage keys that already exist. This is a reskin and a code cleanup, not a feature cull.

## The books themselves

Generated books must look like they belong to this world: painted gouache illustration,
indigo and plum nights, one warm amber lamp light, moon white highlights. See
`lib/illustration-style.ts` for the single shared style brief every image prompt must use.

## Which model paints, and why it is per style

`lib/illustration-style.ts` is the only place a style's machine is chosen, through
`styleModel(value)` and the optional `model` field on a style. Do not send a model name from
a page, a route or a script. The picker's default option is Automatic, which means this file
decides.

**The house painter is `flux-2-max`, and it stays the house painter.** A cheaper graphic model
was tested as a general replacement by painting ten styles twice and comparing the pairs. It
lost eight of ten: it collapses every brief into a single look (graded sky, atmospheric depth,
full colour rendering) and cannot hold a flat palette, a uniform line weight, a limited
palette, or any real drawing medium. Crayon came back as digital painting with a noise
overlay, silhouette came back fully lit and in colour, and the flat Nordic style came back with
gradients and perspective. A model with one house style is not a painter, it is a filter.

Cost is not the tie-breaker here. The cheap model is three cents against nine, and it is still
the wrong buy when the medium is the thing the parent chose. What follows is routed in only
where it was measured to win:

- `papercut`, torn paper collage: `gpt-image-2-5-flare`. It is the only model measured that
  builds the picture out of layered torn shapes. The house painter returns an ordinary painting
  sitting inside a torn paper border, which is a frame, not a collage.
- `amar-chitra` and `chacha-chaudhary`: `qwen-image-3`. Both are densely printed comic styles,
  and this one commits to packed ornament, heavy line and flat printed colour where the house
  painter returns a soft storybook painting.

Everything else uses the house painter. Never promote a model into this file on reputation and
never on price alone.

**The medium leads the prompt.** In `buildIllustrationPrompt` and
`buildCoverIllustrationPrompt`, `style.medium` is the first clause and the generic
"hand made picture book illustration" line follows it. This was measured, not chosen for
style: with the medium third, torn paper collage came back as a smooth digital painting
inside a torn paper border, and with the medium first the same model and clause produced a
convincing collage. When a style stops landing, reorder the prompt before blaming the model.

Two traps are recorded in the build history and cost real time: newer models reject
`width`/`height` and want `aspect_ratio` instead, so the request falls back on that 400, and
prompt length is a hard per-model limit, so prompts are capped by one `PROMPT_LIMIT` constant
held below the smallest limit of any routed model.

## Before you call it done

- `npx tsc --noEmit` is clean.
- `npm run build` compiles.
- No raw hex left in the files you touched: `grep -rE "#[0-9a-fA-F]{6}" <your files>`.
- No `rounded-full` on a control in the files you touched.
- No emoji in a button, heading or label in the files you touched.
- Horizontal overflow is zero at 320, 360, 390 and 414 px.
