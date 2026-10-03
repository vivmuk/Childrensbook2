# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a **parent holding a phone**, in short sessions, making a storybook for or
with their own child *[confirmed by Vivek, 2026-10-03]*. They are not a designer, not a
developer, and often not sitting down: they have one hand free, a child nearby, and a few
minutes. The job is "turn a small idea into a real, finished picture book we can read tonight."

The child is the **reader**, not the operator: they look at pages, listen to narration, and
have pages read to them. Secondary audience exists but is not the design target.

## Product Purpose

KinderQuill takes a short prompt and returns a complete illustrated children's book: written
story, page-by-page illustration, narration audio, a sung theme song, and a downloadable PDF.
It exists so a parent can go from idea to a finished, readable book in one sitting, without
writing, drawing, recording, or typesetting anything themselves.

Success means a parent finishes a book they are proud to read aloud, and comes back to make
another.

## Positioning

A children's storybook generator that ships the **whole artefact**, not a story draft: text,
pictures, narration, song and print-ready PDF arrive from one prompt, and the parent keeps a
library of the books their family made.

## Operating Context

- Runs in the browser; deployed on Railway from `vivmuk/Childrensbook2` (the repo's package
  name is `kinderquill`).
- Generation is powered by the Venice AI API. The parent supplies **their own** Venice API key
  for connector use; the site's own key covers its sample content.
- Generation takes minutes, not seconds, and currently runs as a background job the page polls
  while the parent watches progress.
- Two surfaces, in this order: **the website is the product**, and a **connector** lets the same
  generation happen inside Claude, ChatGPT or Codex for power users *[confirmed by Vivek:
  "a website first, with the connector as a power-user extra"]*.
- Accounts are new in this pass: until now every visitor shared one hardcoded user.

## Capabilities and Constraints

Existing capability set that must survive the revamp:

- Prompt-to-book generation: an 8-page illustrated book with a title page, chosen age range,
  illustration style, hero type and setting.
- A live progress experience while a book generates.
- A **library** of the family's own books, plus favourites and reading history.
- **Reading modes** with narration audio; a sung theme song per book.
- **PDF download** of a finished book, and a shareable link.
- Extras: image animation/video, draw-and-cartoonify, describe-a-drawing, and a video studio.
- **Parent settings**: content filter, daily book cap, sharing permission, approval required.
- A gallery of sample books that a visitor can read before making anything.

Technical constraints:

- Next.js 14 app router, TypeScript, Tailwind, deployed with a Dockerfile.
- Storage is being moved from an ephemeral in-container SQLite file to Railway Postgres in the
  same project; nothing in the current database needs preserving (books can be recreated).
- The API key is a user's own secret: it must never be echoed into a page, an error message or
  a log.

Explicitly undecided: **how users sign in**. Google-only versus adding an emailed magic link
has not been answered. Recorded here as open rather than invented.

## Brand Commitments

- The name **KinderQuill** is committed (it is the package name and the deployed domain).
- An existing icon set ships (`public/favicon.svg`, apple-touch-icon, logo marks).
- The product is for children: content safety is a commitment, not a setting. The parent-facing
  content filter and daily cap are product promises, not preferences.

## Evidence on Hand

- Real generated sample books with real illustrations and text:
  `data/sample-books/index.json` (e.g. "The Brave Little Squirrel").
- The Venice API schema in the repo (`venice-openapi.yaml`) for what the models can do.
- The live deployed app at kinderquill.up.railway.app, verified reachable.

Absent, and not to be invented: testimonials, user counts, prices, uptime or performance
claims, awards, press, or any promise about what a generated book will contain.

## Product Principles

1. The parent's real constraint is one hand, a few minutes, and a child waiting.
2. The finished book is the product; every intermediate screen exists to get there faster.
3. Nothing a family made may be lost, and nothing they did not make may be shown as theirs.
4. A child never encounters a dead end, an error, or an unbounded wait.
5. No invented numbers, testimonials or claims, ever.

## Accessibility & Inclusion

Read-aloud and listening are first-class, not fallbacks: a child who cannot yet read must be
able to use the finished book. Any motion must respect `prefers-reduced-motion`.
