#!/usr/bin/env node
/**
 * Rebuilds the sample books in the app's own painted world.
 *
 * The old samples were generated with a generic "anime / comic" prompt and
 * stored as base64 blobs inside data/sample-books/index.json, which made that
 * one file 19 MB. This script writes the art to real files under
 * public/sample-books/<id>/ and points the JSON at those paths instead, and it
 * assembles every prompt through lib/illustration-style.ts so the samples match
 * the books the app generates today.
 *
 * Safe to re-run: an image that already exists is left alone unless --force.
 *
 *   node scripts/regenerate-sample-books.mjs            # fill in what is missing
 *   node scripts/regenerate-sample-books.mjs --force    # repaint everything
 *   node scripts/regenerate-sample-books.mjs --only sample_night_bus
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The compiled twin of lib/illustration-style.ts (see the build step in the
// header of this repo's scripts/README.md). One source of truth for the look.
import {
  buildCoverIllustrationPrompt,
  buildIllustrationPrompt,
  KQ_PALETTE,
} from '../.kq-build/illustration-style.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ART_DIR = path.join(ROOT, 'public', 'sample-books')
const DATA_DIR = path.join(ROOT, 'data', 'sample-books')

const API_KEY = process.env.VENICE_API_KEY
const MODEL = process.env.KQ_IMAGE_MODEL || 'flux-2-max'
const WIDTH = 1024
const HEIGHT = 1024

const FORCE = process.argv.includes('--force')
const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null

const NEGATIVE =
  'text, letters, words, numbers, lettering, signage, shop signs, street signs, billboards, ' +
  'posters, destination boards, gibberish writing, watermark, signature, logo, border, frame, ' +
  'neon, lens flare, pure black, 3d render, photograph, manga screencap'

/** Two or three sentences about a colour, kept short so it never crowds the art. */
const PALETTES = {
  harbour: 'lamp cream, deep indigo sea, warm amber lantern, moon white',
  monsoon: 'rain grey, deep plum, mango gold, leaf green',
  coast: 'slate blue, lamp cream, amber window light, moon white',
  city: 'indigo night, plum shadows, amber street lamps, cream windows',
  river: 'plum water, indigo sky, cream paper, moon white',
  market: 'deep plum, amber lamps, cream cloth, starlight silver',
}

const STORIES = [
  {
    id: 'sample_lantern_harbour',
    title: 'The Lantern That Would Not Go Out',
    ageRange: '1st',
    category: 'Courage',
    heroType: 'person',
    setting: 'A small harbour at night',
    palette: PALETTES.harbour,
    description:
      'A small girl keeps one small light burning on a windy night, and brings every fishing boat home.',
    characters:
      'Mira, a small girl about five years old in a red knitted hat and a mustard coat, carrying a brass lantern. ' +
      'Her father, a tall kind fisherman in a dark blue jumper. Keep both exactly the same on every page.',
    pages: [
      {
        text:
          'Every evening, Mira lit the little lantern in the window of the harbour house. It was not a big light. It was only as big as a jar of honey.',
        scene:
          'Cosy harbour house interior at dusk, a small girl in a red hat standing on a chair to reach the window, lighting a brass lantern. One warm pool of light on the sill, the sea dark and deep indigo outside the glass.',
        shot: 'warm interior, seen from the room',
      },
      {
        text:
          'But one night the wind came down from the hills and pushed the fishing boats far out to sea. The harbour went dark, and the boats could not find their way home.',
        scene:
          'Wide night view of a small harbour, three little fishing boats scattered far out on a deep indigo sea, all their lights dim, heavy wind in the sky.',
        shot: 'wide establishing shot',
      },
      {
        text:
          'So Mira put on her coat, took the lantern in both hands, and climbed the hill above the harbour. The wind pulled at her hat. The little flame stayed lit.',
        scene:
          'Small girl climbing a dark hill above a harbour, holding a lantern up with both hands, her coat and hat blown sideways by wind, one warm amber pool of light around her, everything else in plum and indigo dusk.',
        shot: 'low angle, wind and effort',
      },
      {
        text:
          'One by one, the boats turned in the dark and followed the small warm light, like moths following a kitchen window.',
        scene:
          'Seen from above and behind the girl: three small fishing boats curving towards a single amber light on the hill, moon white wake lines on dark water.',
        shot: 'high wide shot, the whole bay',
      },
      {
        text:
          'Her father was the last one in. He lifted her up, and the lantern glowed between them like a small sun.',
        scene:
          'Father in a dark blue jumper lifting the small girl, the brass lantern held between them, warm amber light on both faces, boats moored behind, deep indigo night.',
        shot: 'close warm two-shot',
      },
      {
        text:
          'That is why the harbour light is never turned off, even now. And what would you have done, if you had been the one holding the lantern?',
        scene:
          'Final page: the harbour house window glowing warm amber across a calm indigo sea, three boats safely moored, moon white sky, quiet and restful.',
        shot: 'calm wide closing shot',
      },
    ],
  },

  {
    id: 'sample_mango_monsoon',
    title: 'Mango and the Monsoon',
    ageRange: '2nd',
    category: 'Kindness',
    heroType: 'person',
    setting: 'A village in the first rain',
    palette: PALETTES.monsoon,
    description:
      'A boy shares the last mango of the summer with a soaked street dog, and the rain turns into a friend.',
    characters:
      'Aarav, a boy about seven in a yellow cotton shirt and bare feet, holding one ripe mango. ' +
      'A thin tan street dog with one white ear. Keep both exactly the same on every page.',
    pages: [
      {
        text:
          'The last mango of the summer sat in Aarav\u2019s hands, warm as a lamp. He had been saving it for three whole days.',
        scene:
          'Boy in a yellow shirt sitting on a low stone step holding one ripe mango, late afternoon heat, plum and gold light, dust in the air.',
        shot: 'close, the mango in his hands',
      },
      {
        text:
          'Then the sky turned the colour of an old coin, and the first rain of the monsoon came down all at once.',
        scene:
          'Wide village street as the first monsoon rain arrives, grey rain sheet across the rooftops, deep plum clouds, one warm amber window lamp already lit.',
        shot: 'wide establishing shot',
      },
      {
        text:
          'Under the neem tree sat a thin dog, soaked through, with one white ear stuck flat to its head. It looked at the mango. It did not beg.',
        scene:
          'Thin tan dog with one white ear sitting pressed against a tree trunk in heavy rain, wet fur, big patient eyes, wet green leaves above, deep plum shadows.',
        shot: 'medium shot of the dog',
      },
      {
        text:
          'Aarav crouched down and broke the mango in half. The juice ran over his fingers and the rain washed it off.',
        scene:
          'Boy crouching in the rain breaking a ripe mango in half with both hands, golden flesh glowing, rain streaks lit by the fruit, dog watching close by.',
        shot: 'close two-shot in the rain',
      },
      {
        text:
          'The dog ate it in three bites, then shook itself all over Aarav, and the two of them laughed in the rain like it was a warm day.',
        scene:
          'Dog shaking water off in a spray, boy laughing with arms up, wet street, warm amber light spilling from a doorway, joyful movement.',
        shot: 'mid action shot, spray of water',
      },
      {
        text:
          'Every monsoon after that, when the first rain came, a dog with one white ear was waiting under the neem tree. And if you had a mango, would you break it in half?',
        scene:
          'Final page: empty rain-washed village street at dusk, the neem tree, one warm amber lamp in a doorway, calm and cosy, deep plum and grey.',
        shot: 'quiet wide closing shot',
      },
    ],
  },

  {
    id: 'sample_sleepy_lighthouse',
    title: 'The Sleepy Lighthouse',
    ageRange: '1st',
    category: 'Friendship',
    heroType: 'animal',
    setting: 'A windy coast',
    palette: PALETTES.coast,
    description:
      'A lighthouse keeps falling asleep on the job, until a small girl finds out what it really needs.',
    characters:
      'Nell, a small girl in a green raincoat with a mended sleeve, and the lighthouse itself, which has a sleepy painted face on its lantern room. ' +
      'One grey gull with a crooked wing. Keep all three exactly the same on every page.',
    pages: [
      {
        text:
          'The lighthouse on Windy Point had one job: to stay awake. But lately, every night at nine, its light slid shut and it began to snore.',
        scene:
          'Tall striped lighthouse on a rocky point at night, its lantern glowing a soft warm amber, a sleepy painted face on the lantern glass, slow curling clouds, deep slate blue sea.',
        shot: 'wide, the lighthouse tall on the rock',
      },
      {
        text:
          'That was a problem, because the fishing boats came past Windy Point in the dark, and they needed someone awake to show them the way.',
        scene:
          'Three small boats moving through dark slate blue water with one boat veering far too close to rocks, no beam shining, moon white sky.',
        shot: 'medium wide, boats in danger',
      },
      {
        text:
          'Nell lived in the keeper\u2019s cottage at the bottom of the point. She put on her green raincoat, climbed one hundred and twelve steps, and listened.',
        scene:
          'Small girl in a green raincoat climbing a spiral stone staircase inside the lighthouse, one warm amber lamp glow, tall narrow shadows.',
        shot: 'steep upward interior shot',
      },
      {
        text:
          'The lighthouse yawned and said, in a voice like a door opening, that nobody had ever told it a story. Everyone just told it to stay awake.',
        scene:
          'Girl sitting on the lantern room floor beside the enormous warm glowing lamp, the sleepy painted face above her, one small figure, one huge soft light, deep indigo night beyond the glass.',
        shot: 'intimate interior, small girl huge lamp',
      },
      {
        text:
          'So every night at nine, Nell climbed the stairs and told it a story. And the light stayed on, all the way out to sea.',
        scene:
          'The lighthouse beam sweeping out across dark water in a warm amber arc, small boats lit as they pass, girl visible in the glowing lantern room window.',
        shot: 'wide dramatic sweep of the beam',
      },
      {
        text:
          'The boats still pass Windy Point at night. And what story would you tell, if you were the one climbing the stairs?',
        scene:
          'Final page: the lighthouse glowing gently on its point, calm slate blue sea, one gull with a crooked wing asleep on the railing, moon white sky, restful.',
        shot: 'calm wide closing shot',
      },
    ],
  },

  {
    id: 'sample_night_bus',
    title: 'Nimbu the Night Bus',
    ageRange: '2nd',
    category: 'Adventure',
    heroType: 'object',
    setting: 'A sleeping city',
    palette: PALETTES.city,
    description:
      'A small green night bus quietly collects the city\u2019s tired animals and takes every one of them home.',
    characters:
      'Nimbu, a small green bus with one round amber headlight and a hand-painted smile on the front. ' +
      'Passengers: a drowsy tabby cat, an owl with round glasses, a hedgehog, and a tortoise. Keep them all exactly the same on every page.',
    pages: [
      {
        text:
          'At midnight, when the street lamps leaned over and yawned, the little green bus called Nimbu started its engine. It had never once been late.',
        scene:
          'Small green bus with one round amber headlight and a painted smile parked on an empty indigo city street at midnight, warm amber street lamps, quiet shop windows.',
        shot: 'three-quarter front view of the bus',
      },
      {
        text:
          'First stop: the library steps, where a tabby cat was asleep on the returns box with its tail hanging down.',
        scene:
          'Green bus stopped beside wide stone library steps, a sleepy tabby cat curled on a box, one warm amber pool from the headlight, deep indigo night.',
        shot: 'medium wide from the street',
      },
      {
        text:
          'Next stop: the park fence, where an owl in round glasses was waiting, and pretending it had not been waiting long.',
        scene:
          'Bus at a dark park fence, an owl with round glasses perched on a post, long shadows, warm amber headlight beam on wet pavement.',
        shot: 'side-on shot of bus and owl',
      },
      {
        text:
          'The hedgehog climbed in backwards, as hedgehogs do, and the tortoise took the whole evening to get up the last step. Nimbu waited. Nimbu always waited.',
        scene:
          'Interior of the bus, warm amber lamps along the ceiling, a hedgehog and a tortoise in the aisle, the bus smiling in the driver\u2019s mirror, plum shadows.',
        shot: 'cosy interior, looking down the aisle',
      },
      {
        text:
          'So it went, up the hill and down the hill, until the last passenger was home and the city was quiet.',
        scene:
          'Green bus climbing a steep indigo hill in a sleeping city, rows of warm amber windows, moon white sky, trails of warm light behind it.',
        shot: 'high wide city shot',
      },
      {
        text:
          'If you were awake at midnight and heard a gentle engine outside, would you come for a ride? Where would you ask to go?',
        scene:
          'Final page: the little green bus parked for the night under a tree, headlight off, softly glowing amber windows, deep indigo and plum, calm and safe.',
        shot: 'quiet closing shot of the parked bus',
      },
    ],
  },

  {
    id: 'sample_paper_boat',
    title: 'The Paper Boat That Sailed to the Moon',
    ageRange: '1st',
    category: 'Feelings',
    heroType: 'person',
    setting: 'A river at dusk',
    palette: PALETTES.river,
    description:
      'A girl folds her worry into a paper boat and lets the river carry it all the way up to the moon.',
    characters:
      'Sana, a girl about six in a cream nightdress with a plum ribbon in her hair, holding one folded cream paper boat. Keep her exactly the same on every page.',
    pages: [
      {
        text:
          'Sana had a worry. It was not a big worry, but it would not go to sleep, and so neither could she.',
        scene:
          'Small girl in a cream nightdress sitting up in bed in a dark indigo room, plum shadows, one warm amber candle on the sill, a small worried expression, quiet.',
        shot: 'close intimate bedroom shot',
      },
      {
        text:
          'So she folded a boat out of paper, the way her grandmother had shown her, with the corners tucked in tight.',
        scene:
          'Close view of small hands folding a cream paper boat on a windowsill, warm amber candle light, deep plum shadows, careful fingers.',
        shot: 'extreme close on the hands and paper',
      },
      {
        text:
          'She put it in the river and whispered the worry into it, and the river took the boat away.',
        scene:
          'Girl kneeling at the edge of a dark plum river at dusk, placing a small cream paper boat on the water, one warm amber ripple of light, indigo sky.',
        shot: 'low shot at the waterline',
      },
      {
        text:
          'The boat sailed past the sleeping boats and the sleeping trees, and the moon came down low to have a look at it.',
        scene:
          'Wide dusk river scene, a small cream paper boat tiny on wide plum water, a big soft moon white moon low on the horizon, indigo hills.',
        shot: 'very wide, boat small and brave',
      },
      {
        text:
          'The moon kept the worry, which is what moons are for, and sent back a small white feather instead.',
        scene:
          'The paper boat on moonlit water with a single soft white feather drifting down into it, big pale moon above, deep indigo and plum, dreamy.',
        shot: 'medium shot, feather landing',
      },
      {
        text:
          'Sana found the feather on the windowsill in the morning, and she could not remember what the worry had been. What would you put in your paper boat?',
        scene:
          'Final page: a cream feather on a sunny windowsill with the curtains open, the paper boat beside it, warm lamp cream morning light, calm and happy.',
        shot: 'still life, gentle morning close',
      },
    ],
  },

  {
    id: 'sample_starlight_market',
    title: 'Amara and the Starlight Market',
    ageRange: '3rd',
    category: 'Wonder',
    heroType: 'person',
    setting: 'A night market under the stars',
    palette: PALETTES.market,
    description:
      'A girl is given one jar of starlight and has to decide what it is really for.',
    characters:
      'Amara, a girl about eight in a deep plum shawl with a cream stripe, carrying a small glass jar. ' +
      'The market seller is a tall old woman with silver hair in a dark indigo sari. Keep both exactly the same on every page.',
    pages: [
      {
        text:
          'Once a year, on the night the stars come down low, the market opens behind the last house on Amara\u2019s street.',
        scene:
          'Narrow lane behind the last house opening into a night market, deep plum cloth stalls, rows of warm amber lamps, stars hanging very low, indigo sky.',
        shot: 'wide establishing shot of the market',
      },
      {
        text:
          'The stalls sold ordinary things \u2014 spoons, fish, buttons \u2014 and one stall sold light. In jars. Very neatly.',
        scene:
          'Market stall shelves of small glass jars each holding a soft white glow, an old woman with silver hair behind the counter, warm amber lamps, plum shadows.',
        shot: 'medium shot of the stall',
      },
      {
        text:
          'The old seller looked at Amara for a long moment and said, \u201cOne jar. Not two. Choose what you need, not what you want.\u201d',
        scene:
          'Tall old woman in a dark indigo sari with silver hair handing one small glass jar of white light to a girl in a plum shawl, warm amber lamp light on both faces.',
        shot: 'close two-shot across the counter',
      },
      {
        text:
          'Amara wanted to keep it. She thought of her shelf, and how beautiful the jar would look on it, glowing, all hers.',
        scene:
          'Girl walking home holding the glowing jar, looking down at it, the market bright behind her, deep indigo street ahead, the light on her face only.',
        shot: 'medium, walking away from the market',
      },
      {
        text:
          'Then she heard her neighbour\u2019s baby crying in the dark, because their lamp had gone out. So she gave them the jar instead.',
        scene:
          'Girl standing in a doorway handing the glowing jar to a tired mother holding a small baby, warm amber light spreading into a dark plum room, kind faces.',
        shot: 'warm interior doorway shot',
      },
      {
        text:
          'The seller saw. And so Amara got her jar after all, filled twice as full. What would you have done with yours?',
        scene:
          'Final page: the girl holding a brighter jar of white light on the market lane, the old seller smiling, warm amber lamps, deep plum and indigo, stars low, quiet wonder.',
        shot: 'closing medium shot, faces lit',
      },
    ],
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function generateImage(prompt, seed, attemptMax = 4) {
  for (let attempt = 1; attempt <= attemptMax; attempt++) {
    try {
      const res = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          width: WIDTH,
          height: HEIGHT,
          format: 'webp',
          steps: 20,
          seed,
          negative_prompt: NEGATIVE,
          cfg_scale: 7,
          hide_watermark: true,
          safe_mode: true,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.images?.[0]) return data.images[0]
        console.error(`  no image in response (attempt ${attempt})`)
      } else {
        const body = (await res.text()).slice(0, 160)
        console.error(`  http ${res.status} (attempt ${attempt}): ${body}`)
        if (res.status === 401 || res.status === 402 || res.status === 400) return null
      }
    } catch (err) {
      console.error(`  request failed (attempt ${attempt}):`, err.message)
    }
    if (attempt < attemptMax) await sleep(attempt * 3000)
  }
  return null
}

function seedFor(id, tag) {
  let h = 7
  for (const c of `${id}:${tag}`) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h) % 999999999
}

async function main() {
  if (!API_KEY) {
    console.error('VENICE_API_KEY is not set. Nothing to do.')
    process.exit(1)
  }

  await mkdir(ART_DIR, { recursive: true })
  await mkdir(DATA_DIR, { recursive: true })

  const stories = ONLY ? STORIES.filter((s) => s.id === ONLY) : STORIES
  if (!stories.length) {
    console.error(`No story matches --only ${ONLY}`)
    process.exit(1)
  }

  const built = []

  for (const story of stories) {
    const dir = path.join(ART_DIR, story.id)
    await mkdir(dir, { recursive: true })
    console.log(`\n=== ${story.title} (${story.pages.length} pages) ===`)

    // Cover
    const coverFile = path.join(dir, 'cover.webp')
    let coverUrl = `/sample-books/${story.id}/cover.webp`
    if (!existsSync(coverFile) || FORCE) {
      const prompt = buildCoverIllustrationPrompt({
        characters: story.characters,
        palette: story.palette,
        title: story.title,
        scene: story.pages[0].scene,
      })
      const b64 = await generateImage(prompt, seedFor(story.id, 'cover'))
      if (!b64) throw new Error(`cover failed for ${story.id}`)
      await writeFile(coverFile, Buffer.from(b64, 'base64'))
      console.log('  cover.webp  written')
    } else {
      console.log('  cover.webp  already there')
    }

    // Pages
    const pages = []
    for (let i = 0; i < story.pages.length; i++) {
      const page = story.pages[i]
      const file = path.join(dir, `page-${i + 1}.webp`)
      if (!existsSync(file) || FORCE) {
        const prompt = buildIllustrationPrompt({
          characters: story.characters,
          palette: story.palette,
          shot: page.shot,
          scene: page.scene,
        })
        const b64 = await generateImage(prompt, seedFor(story.id, `page-${i + 1}`))
        if (!b64) throw new Error(`page ${i + 1} failed for ${story.id}`)
        await writeFile(file, Buffer.from(b64, 'base64'))
        console.log(`  page-${i + 1}.webp written`)
      } else {
        console.log(`  page-${i + 1}.webp already there`)
      }
      pages.push({
        pageNumber: i + 1,
        text: page.text,
        image: `/sample-books/${story.id}/page-${i + 1}.webp`,
      })
    }

    const book = {
      id: story.id,
      title: story.title,
      ageRange: story.ageRange,
      illustrationStyle: 'Hand painted gouache',
      description: story.description,
      category: story.category,
      heroType: story.heroType,
      setting: story.setting,
      expectedPages: story.pages.length,
      titlePage: { image: coverUrl, title: story.title },
      pages,
      status: 'completed',
      createdAt: new Date().toISOString(),
    }

    built.push(book)
    await writeFile(path.join(DATA_DIR, `${story.id}.json`), JSON.stringify(book, null, 2))
  }

  // index.json is the file the app actually reads at startup.
  const existing = existsSync(path.join(DATA_DIR, 'index.json'))
    ? JSON.parse(await readFile(path.join(DATA_DIR, 'index.json'), 'utf8'))
    : []
  const byId = new Map(existing.map((b) => [b.id, b]))
  for (const book of built) byId.set(book.id, book)
  const merged = Array.from(byId.values())
  await writeFile(path.join(DATA_DIR, 'index.json'), JSON.stringify(merged, null, 2))

  console.log(`\nDone. ${built.length} book(s) rebuilt, index holds ${merged.length}.`)
  console.log(`Palette in force: ${KQ_PALETTE.slice(0, 60)}...`)
}

main().catch((err) => {
  console.error('\nFAILED:', err.message)
  process.exit(1)
})
