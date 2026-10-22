/**
 * A finished book as one self-contained HTML file.
 *
 * One renderer, two uses, so the download and the PDF can never disagree:
 *
 *   'reader'  the HTML download. On screen it is a book you flip through
 *             (swipe, arrow keys, the page corners), with the narration and
 *             songs inside it when they have been made. Printed, it becomes
 *             the print layout below.
 *   'print'   the PDF. Every sheet is exactly one printed page, A4 landscape:
 *             the cover alone on its sheet with the title painted into it,
 *             then one sheet per story page, picture over words.
 *
 * Pure string work with no Node or browser APIs, so the server's PDF route and
 * the reader's download button both import it.
 */

export interface ExportPage {
  text: string
  image: string
}

export interface ExportBook {
  id?: string
  title: string
  titlePage?: { image: string; title: string }
  pages: ExportPage[]
  meta?: {
    dedication?: string
    author?: string
    narration?: Array<{ url: string; text: string } | null>
    coverNarration?: { url: string }
    songs?: Array<{ kind: string; title: string; url: string; lyrics?: string }>
  }
  songUrl?: string
}

export interface ExportOptions {
  mode: 'reader' | 'print'
  /** Embed narration and songs. They make a file far larger, so it is optional. */
  includeAudio?: boolean
  /**
   * Where relative picture paths resolve from. Sample books point at files on
   * the site, which a downloaded file or the PDF renderer cannot find without it.
   */
  baseUrl?: string
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Paragraphs from the page text, keeping a parent's own line breaks. */
function prose(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${esc(para.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** The size the words are set at, by how many there are, so long pages still fit one sheet. */
function textSize(text: string): string {
  const n = text.length
  if (n < 140) return '19pt'
  if (n < 260) return '16.5pt'
  if (n < 420) return '14.5pt'
  if (n < 620) return '13pt'
  return '11.5pt'
}

const CSS = `
:root {
  --navy: rgb(27 29 58);
  --ink: rgb(20 18 42);
  --plum: rgb(58 35 64);
  --cream: rgb(246 231 201);
  --cream-dim: rgb(232 214 178);
  --page-ink: rgb(59 42 30);
  --moon: rgb(244 242 236);
  --dim: rgb(169 165 204);
  --line: rgba(244, 242, 236, 0.16);
  --amber: rgb(224 160 70);
  --amber-ink: rgb(36 26 18);
  --serif: 'Fraunces', Georgia, 'Iowan Old Style', 'Times New Roman', serif;
  --ui: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: var(--navy); }
img { display: block; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* A sheet is one page of the book, landscape like a picture book. */
.sheet {
  background: var(--cream);
  color: var(--page-ink);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.sheet .art {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
/* The whole picture, always: never cropped, never stretched. */
.sheet .art img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; border-radius: 6px; }
.sheet .words {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  font-family: var(--serif);
  line-height: 1.5;
}
.sheet .words p + p { margin-top: 0.5em; }
.sheet .folio { position: absolute; bottom: 5mm; left: 0; right: 0; text-align: center; font: 500 9pt var(--ui); color: rgba(59, 42, 30, 0.5); }

.cover { background: var(--cream); }
.cover .art { flex: 1 1 auto; height: 100%; }
.cover .art img { border-radius: 0; }

.quiet { justify-content: center; align-items: center; text-align: center; font-family: var(--serif); }
.quiet h2 { font-size: 34pt; font-weight: 600; color: var(--page-ink); }
.quiet .dedication { font-size: 18pt; font-style: italic; max-width: 70%; line-height: 1.5; }
.quiet .small { margin-top: 6mm; font: 500 10pt var(--ui); color: rgba(59, 42, 30, 0.6); }
.lyrics { margin-top: 8mm; font: 400 10.5pt/1.5 var(--serif); white-space: pre-line; columns: 2; column-gap: 12mm; text-align: left; max-width: 80%; }
.lyrics-title { margin-top: 10mm; font: 600 11pt var(--ui); letter-spacing: 0.08em; text-transform: uppercase; color: rgba(59, 42, 30, 0.6); }

/* ── Print: one sheet per printed page, A4 landscape, no margins to fight. ── */
@page { size: A4 landscape; margin: 0; }
@media print {
  html, body { background: var(--cream); }
  .chrome, audio, .turn { display: none !important; }
  .book, .stage { all: unset; display: block; }
  .sheet {
    width: 297mm;
    height: 210mm;
    break-after: page;
    page-break-after: always;
    break-inside: avoid;
    page-break-inside: avoid;
    display: flex !important;
    position: relative !important;
    inset: auto !important;
    transform: none !important;
    opacity: 1 !important;
    border-radius: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet:last-child { break-after: auto; page-break-after: auto; }
  .story { padding: 10mm 14mm 12mm; }
  .story .art { height: 138mm; }
  .story .words { padding: 4mm 10mm 2mm; }
  .cover { padding: 6mm; }
}
`

/** The print layout on screen too, stacked, for the PDF renderer and preview. */
const PRINT_SCREEN_CSS = `
@media screen {
  body { padding: 24px 12px; background: var(--navy); }
  .sheet {
    width: min(100%, 1060px);
    aspect-ratio: 297 / 210;
    margin: 0 auto 24px;
    border-radius: 14px;
  }
  .story { padding: 3.4% 4.7% 4%; }
  .story .art { height: 66%; }
  .story .words { padding: 1.4% 3.4% 0; font-size: clamp(11px, 1.7vw, 22px) !important; }
  .cover { padding: 2%; }
  .quiet h2 { font-size: clamp(22px, 4vw, 44px); }
}
`

/** The flip-through reader for the HTML download. */
const READER_CSS = `
@media screen {
  body {
    min-height: 100vh;
    background:
      radial-gradient(120% 80% at 50% 0%, var(--plum) 0%, transparent 60%),
      linear-gradient(170deg, var(--navy) 0%, var(--plum) 100%);
    color: var(--moon);
    font-family: var(--ui);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-x: hidden;
  }
  .chrome.top { width: 100%; max-width: 1180px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px 6px; }
  .chrome.top h1 { font: 600 clamp(16px, 2.4vw, 22px)/1.2 var(--serif); color: var(--moon); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chrome .count { font-size: 13px; color: var(--dim); white-space: nowrap; }
  .stage { width: 100%; max-width: 1180px; flex: 1; display: flex; align-items: center; justify-content: center; padding: 6px 16px; perspective: 2200px; }
  .book { position: relative; width: min(100%, calc((100vh - 170px) * 1.414)); aspect-ratio: 297 / 210; }
  .sheet {
    position: absolute; inset: 0;
    border-radius: 14px;
    border: 1px solid rgba(59, 42, 30, 0.12);
    transform-origin: left center;
    transition: transform 0.6s cubic-bezier(.2,.7,.2,1), opacity 0.45s ease;
    backface-visibility: hidden;
    opacity: 0;
    pointer-events: none;
    transform: rotateY(0deg);
  }
  .sheet.is-on { opacity: 1; pointer-events: auto; }
  .sheet.is-gone { opacity: 0; transform: rotateY(-75deg); }
  .sheet.is-next { opacity: 0; transform: translateX(3%); }
  .story { padding: 3% 4.5% 4%; }
  .story .art { height: 66%; }
  .story .words { padding: 1.5% 3% 0; font-size: clamp(12px, 1.75vw, 23px) !important; }
  .cover { padding: 1.6%; }
  .quiet h2 { font-size: clamp(24px, 4.4vw, 48px); }
  .quiet .dedication { font-size: clamp(15px, 2.2vw, 24px); }
  .turn { position: absolute; top: 0; bottom: 0; width: 18%; cursor: pointer; z-index: 3; background: transparent; border: 0; }
  .turn.prev { left: 0; } .turn.next { right: 0; }
  .chrome.bottom { width: 100%; max-width: 1180px; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 16px 18px; flex-wrap: wrap; }
  .btn { font: 600 15px var(--ui); padding: 12px 20px; border-radius: 14px; border: 1px solid var(--line); background: rgba(244, 242, 236, 0.06); color: var(--moon); cursor: pointer; }
  .btn.primary { background: var(--amber); color: var(--amber-ink); border-color: transparent; }
  .btn:disabled { opacity: 0.4; cursor: default; }
  .dots { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; width: 100%; }
  .dot { width: 9px; height: 9px; border-radius: 3px; background: rgba(244, 242, 236, 0.28); border: 0; cursor: pointer; transition: width 0.2s ease, background-color 0.2s ease; }
  .dot.on { width: 24px; background: var(--amber); }
  .sung { width: min(100%, 520px); display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--dim); }
  .sung audio { flex: 1; height: 34px; }
}
/* A phone held upright gets an upright page: picture on top, words large below. */
@media screen and (max-width: 700px) {
  .book { width: 100%; aspect-ratio: 3 / 4.1; max-height: calc(100vh - 170px); }
  .story { padding: 4% 4% 9%; }
  .story .art { height: 50%; }
  .story .words { padding: 3% 2% 0; font-size: clamp(15px, 4.4vw, 20px) !important; justify-content: flex-start; }
  .cover .art img { max-height: 100%; }
}
@media (prefers-reduced-motion: reduce) { .sheet { transition: none !important; } }
`

const READER_SCRIPT = `
(function () {
  var sheets = Array.prototype.slice.call(document.querySelectorAll('.sheet'));
  var dots = document.querySelector('.dots');
  var count = document.querySelector('.count');
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');
  var readBtn = document.getElementById('read');
  var voice = document.getElementById('voice');
  var at = 0, reading = false;
  sheets.forEach(function (_, i) {
    var d = document.createElement('button');
    d.className = 'dot'; d.setAttribute('aria-label', 'Go to page ' + (i + 1));
    d.onclick = function () { show(i); };
    dots.appendChild(d);
  });
  function show(i) {
    if (i < 0 || i >= sheets.length) return;
    at = i;
    sheets.forEach(function (s, j) {
      s.classList.toggle('is-on', j === i);
      s.classList.toggle('is-gone', j < i);
      s.classList.toggle('is-next', j > i);
      s.setAttribute('aria-hidden', j === i ? 'false' : 'true');
    });
    Array.prototype.forEach.call(dots.children, function (d, j) { d.classList.toggle('on', j === i); });
    count.textContent = (i + 1) + ' of ' + sheets.length;
    prev.disabled = i === 0; next.disabled = i === sheets.length - 1;
    if (reading) speakCurrent();
  }
  function speakCurrent() {
    if (!voice) return;
    var src = sheets[at].getAttribute('data-voice');
    if (!src) { if (at < sheets.length - 1) setTimeout(function () { show(at + 1); }, 2500); else stopReading(); return; }
    voice.src = src; voice.play().catch(function () {});
  }
  function stopReading() { reading = false; if (voice) voice.pause(); if (readBtn) readBtn.textContent = 'Read to me'; }
  if (voice) voice.addEventListener('ended', function () { if (!reading) return; if (at < sheets.length - 1) setTimeout(function () { show(at + 1); }, 700); else stopReading(); });
  if (readBtn) readBtn.onclick = function () { if (reading) { stopReading(); return; } reading = true; readBtn.textContent = 'Stop reading'; speakCurrent(); };
  prev.onclick = function () { show(at - 1); };
  next.onclick = function () { show(at + 1); };
  document.querySelector('.turn.prev').onclick = function () { show(at - 1); };
  document.querySelector('.turn.next').onclick = function () { show(at + 1); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(at + 1); }
    if (e.key === 'ArrowLeft') show(at - 1);
  });
  var x0 = null;
  document.querySelector('.book').addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  document.querySelector('.book').addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
  });
  show(0);
})();
`

export function renderBookHTML(book: ExportBook, opts: ExportOptions): string {
  const title = esc(book.title || 'My Story')
  const audio = opts.mode === 'reader' && opts.includeAudio !== false
  const narration = book.meta?.narration || []
  const songs = book.meta?.songs || []
  const sheets: string[] = []

  if (book.titlePage?.image) {
    const v = audio && book.meta?.coverNarration?.url ? ` data-voice="${esc(book.meta.coverNarration.url)}"` : ''
    sheets.push(
      `<section class="sheet cover"${v}><h2 class="sr-only">${title}</h2>` +
        `<div class="art"><img src="${esc(book.titlePage.image)}" alt="The cover of ${title}"></div></section>`,
    )
  }

  if (book.meta?.dedication) {
    sheets.push(
      `<section class="sheet quiet"><p class="dedication">${esc(book.meta.dedication)}</p>` +
        (book.meta.author ? `<p class="small">By ${esc(book.meta.author)}</p>` : '') +
        `</section>`,
    )
  }

  book.pages.forEach((page, i) => {
    const v = audio && narration[i]?.url && narration[i]?.text === page.text ? ` data-voice="${esc(narration[i]!.url)}"` : ''
    sheets.push(
      `<section class="sheet story"${v}>` +
        `<div class="art"><img src="${esc(page.image)}" alt="Picture for page ${i + 1}"></div>` +
        `<div class="words" style="font-size:${textSize(page.text)}">${prose(page.text)}</div>` +
        `<div class="folio">${i + 1}</div>` +
        `</section>`,
    )
  })

  const sung = songs.find((s) => s.kind === 'story') || songs.find((s) => s.kind === 'theme')
  sheets.push(
    `<section class="sheet quiet"><h2>The End</h2>` +
      (sung?.lyrics ? `<p class="lyrics-title">${esc(sung.title)}</p><div class="lyrics">${esc(sung.lyrics.replace(/\[[^\]]+\]\n?/g, ''))}</div>` : '') +
      `<p class="small">Made with KinderQuill</p></section>`,
  )

  const hasVoice = audio && sheets.some((s) => s.includes('data-voice='))
  const songPlayers = audio
    ? songs
        .filter((s) => s.kind !== 'background')
        .map((s) => `<div class="sung"><span>${esc(s.title)}</span><audio controls preload="none" src="${esc(s.url)}"></audio></div>`)
        .join('')
    : ''

  const head =
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<title>${title}</title>` +
    (opts.baseUrl ? `<base href="${esc(opts.baseUrl.replace(/\/?$/, '/'))}">` : '') +
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    `<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">` +
    `<style>${CSS}${opts.mode === 'reader' ? READER_CSS : PRINT_SCREEN_CSS}</style></head>`

  if (opts.mode === 'print') {
    return `${head}<body>${sheets.join('')}</body></html>`
  }

  return (
    `${head}<body>` +
    `<header class="chrome top"><h1>${title}</h1><span class="count"></span></header>` +
    `<main class="stage"><div class="book">${sheets.join('')}` +
    `<button class="turn prev" aria-label="Previous page"></button><button class="turn next" aria-label="Next page"></button></div></main>` +
    `<footer class="chrome bottom">` +
    `<button class="btn" id="prev">Back</button>` +
    (hasVoice ? `<button class="btn" id="read">Read to me</button>` : '') +
    `<button class="btn primary" id="next">Turn the page</button>` +
    `<div class="dots"></div>${songPlayers}` +
    `</footer>` +
    (hasVoice ? `<audio id="voice" preload="none"></audio>` : '') +
    `<script>${READER_SCRIPT}</script></body></html>`
  )
}

/** A file name a parent will recognise in their downloads folder. */
export function bookFileName(title: string, ext: string): string {
  const base = (title || 'my-story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-story'
  return `${base}.${ext}`
}
