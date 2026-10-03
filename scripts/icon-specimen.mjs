/**
 * Renders every icon in the set onto one page, at the sizes the app uses, so the
 * drawings can actually be looked at before they ship anywhere.
 *
 *   node scripts/icon-specimen.mjs
 *
 * Writes .impeccable/type/icon-specimen.html and prints the path.
 *
 * The sheet is deliberately plain: one ink colour, four sizes, nothing coloured
 * or filled by position. A specimen that changes size AND colour AND fill at
 * once cannot be judged, because you cannot tell which of the three you are
 * reacting to.
 */

import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

execFileSync(
  'npx',
  ['tsc', 'components/Icons.tsx', '--outDir', '.kq-build', '--jsx', 'react-jsx',
   '--module', 'esnext', '--target', 'es2020', '--moduleResolution', 'bundler', '--skipLibCheck'],
  { cwd: ROOT, stdio: 'inherit' },
)

const { Icon, ICON_NAMES } = await import(path.join(ROOT, '.kq-build', 'Icons.js'))
const { renderToStaticMarkup } = await import('react-dom/server')
const React = await import('react')

const SIZES = [16, 20, 26, 34, 44]
const SOLID = [
  ['auto_awesome', 22], ['star', 22], ['favorite', 22],
  ['play_arrow', 22], ['pause', 22], ['stop', 22],
]

const draw = (name, size, props = {}) =>
  renderToStaticMarkup(React.createElement(Icon, { name, size, ...props }))

const rows = ICON_NAMES.map((name) => `<figure class="item">
    <div class="sizes">${SIZES.map((s) => `<div class="cell">${draw(name, s)}</div>`).join('')}</div>
    <figcaption>${name}</figcaption>
  </figure>`).join('\n')

const solidRow = SOLID.map(([name, size]) =>
  `<figure class="item small">${draw(name, size)}<figcaption>${name}</figcaption></figure>`).join('\n')

/* A strip of the real thing: icons sitting in real buttons at real sizes. */
const strip = `
  <div class="usage">
    <button class="btn primary">${draw('auto_stories', 18)} Make a book</button>
    <button class="btn">${draw('play_arrow', 18)} Read aloud</button>
    <button class="btn">${draw('download', 18)} Download</button>
    <button class="btn">${draw('volume_up', 18)} Narrate</button>
    <button class="btn">${draw('share', 18)} Save and share</button>
    <button class="btn icon-only">${draw('home', 20)}</button>
    <button class="btn icon-only">${draw('star', 20, { filled: true })}</button>
    <button class="btn icon-only">${draw('delete', 20)}</button>
    <span class="line">${draw('chevron_left', 18)} Previous ${draw('chevron_right', 18)}</span>
    <span class="line dim">${draw('progress_activity', 18)} Painting your book</span>
    <span class="line">${draw('book', 18)} ${draw('menu_book', 18)} ${draw('auto_stories', 18)}</span>
  </div>`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>KinderQuill icon set</title>
<style>
  :root {
    --ground: rgb(23, 21, 43);
    --card: rgb(33, 30, 58);
    --line: rgb(58, 53, 92);
    --text: rgb(244, 238, 226);
    --dim: rgb(163, 157, 190);
    --amber: rgb(240, 178, 92);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 44px 56px;
    background: radial-gradient(120% 90% at 12% 0%, rgb(38, 33, 68) 0%, var(--ground) 55%, rgb(17, 15, 33) 100%);
    color: var(--text);
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  h1 { font-size: 25px; margin: 0 0 6px; letter-spacing: -0.01em; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--dim);
       margin: 38px 0 14px; font-weight: 600; }
  p.sub { margin: 0; color: var(--dim); font-size: 13.5px; }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
  figure.item {
    margin: 0; background: var(--card); border: 1px solid var(--line);
    border-radius: 12px; padding: 15px 10px 11px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 11px;
  }
  .sizes { display: flex; align-items: center; justify-content: center; gap: 15px; height: 46px; }
  .cell { display: flex; align-items: center; }
  figcaption { font-size: 10.5px; color: var(--dim); letter-spacing: 0.02em; }
  .solid-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
  figure.item.small { padding: 18px 10px 11px; }
  .usage {
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
    background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 20px;
  }
  .btn {
    display: inline-flex; align-items: center; gap: 8px; font: inherit; font-size: 15px;
    padding: 11px 18px; border-radius: 12px; border: 1px solid var(--line);
    background: rgb(43, 39, 74); color: var(--text);
  }
  .btn.primary { background: var(--amber); color: rgb(41, 27, 8); border-color: var(--amber); font-weight: 600; }
  .btn.icon-only { padding: 11px 13px; }
  .line { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text); }
  .line.dim { color: var(--dim); }
</style>
</head>
<body>
  <h1>KinderQuill icon set</h1>
  <p class="sub">${ICON_NAMES.length} drawings, each at ${SIZES.join(', ')} pixels. One weight, round ends, drawn on a 24 grid.</p>

  <h2>The set</h2>
  <div class="grid">
${rows}
  </div>

  <h2>The solid ones</h2>
  <div class="solid-grid">
${solidRow}
  </div>

  <h2>At work, at the real sizes</h2>
${strip}
</body>
</html>`

const out = path.join(ROOT, '.impeccable', 'type')
await mkdir(out, { recursive: true })
const file = path.join(out, 'icon-specimen.html')
await writeFile(file, html)
console.log(file)
console.log(`${ICON_NAMES.length} icons`)
