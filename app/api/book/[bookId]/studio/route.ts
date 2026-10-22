import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/storage'
import {
  buildCoverIllustrationPrompt,
  buildIllustrationPrompt,
  buildPageTouchUpPrompt,
  buildSceneWithHeroPrompt,
  KQ_COVER_NEGATIVE,
} from '@/lib/illustration-style'
import {
  chat,
  editImage,
  EDIT_MODEL_FALLBACKS,
  generateImage,
  parseModelJSON,
  resolveApiKey,
  resolveDefaultEditModel,
  resolveDefaultImageModel,
} from '@/lib/venice'

export const maxDuration = 180

/**
 * The author's helpers in the studio. None of these save anything: each one
 * hands back a suggestion (new words, a new picture, a new page) that the
 * parent can keep or throw away, and the studio saves the whole draft at once
 * through PATCH /api/book/[bookId].
 *
 * Actions:
 *   rewrite   new words for a page, following an instruction
 *   ideas     three short ideas for making a page better
 *   repaint   a new picture for a page, around the book's hero
 *   touchup   the same picture with one change applied
 *   newpage   a new page (words and picture) to go after a given page
 *   cover     a new cover, with the current title lettered into it
 */
export async function POST(request: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const body = await request.json()
    const apiKey = resolveApiKey(body.userApiKey)
    if (!apiKey) return NextResponse.json({ error: 'Add your Venice API key to use the studio helpers.' }, { status: 400 })

    const book = await getBook(params.bookId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    const meta = book.meta || {}
    const style = book.illustrationStyle
    const language = meta.language || 'English'
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 400) : ''
    // The studio sends its draft, so a helper sees the words the parent is looking at.
    const draftPages: string[] = Array.isArray(body.pageTexts)
      ? body.pageTexts.map((t: unknown) => String(t || '').slice(0, 3000))
      : book.pages.map(p => p.text)
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : book.title
    const index = Number.isInteger(body.pageIndex) ? body.pageIndex : -1
    const storySoFar = draftPages.map((t, i) => `Page ${i + 1}: ${t}`).join('\n')
    const readingLevel = `${book.ageRange} grade`

    const heroLock = [
      meta.heroName ? `The hero is ${meta.heroName}.` : '',
      meta.heroDescription ? `Main character: ${meta.heroDescription}.` : '',
      meta.otherCharacters?.length ? `Other characters: ${meta.otherCharacters.join('; ')}.` : '',
    ].filter(Boolean).join(' ')

    const paintPage = async (scene: string, shot?: string): Promise<string | null> => {
      if (meta.heroImage) {
        const img = await editImage(apiKey, {
          image: meta.heroImage,
          prompt: buildSceneWithHeroPrompt({
            style, scene, shot, heroName: meta.heroName,
            palette: meta.visualBible?.colorPalette,
            characters: meta.otherCharacters?.join('; ') || undefined,
          }),
          model: await resolveDefaultEditModel(apiKey),
          fallbacks: EDIT_MODEL_FALLBACKS,
          aspectRatio: '3:2',
        })
        if (img) return img.dataUrl
      }
      const img = await generateImage(apiKey, {
        prompt: buildIllustrationPrompt({ style, scene, shot, characters: heroLock || undefined, palette: meta.visualBible?.colorPalette }),
        model: meta.imageModel || (await resolveDefaultImageModel(apiKey)),
        width: 1248,
        height: 832,
      })
      return img?.dataUrl || null
    }

    const sceneFor = (i: number) =>
      meta.scenes?.[i]?.imageDescription || draftPages[i] || 'A gentle, magical moment from the story'

    switch (body.action) {
      case 'rewrite': {
        if (index < 0 || index >= draftPages.length) return bad('Pick a page first.')
        const raw = await chat(apiKey, {
          system:
            `You are a gentle, award-winning children's picture book editor. You rewrite one page of a book at a time, keeping the story, characters and voice. Reading level: ${readingLevel}. Write in ${language}. Answer with ONLY a JSON object: {"text":"the new page text"}.`,
          user:
            `The book is "${title}".\n\nThe whole story:\n${storySoFar}\n\nRewrite page ${index + 1}. ` +
            (instruction ? `The author asks: ${instruction}` : 'Make it more vivid and more fun to read aloud, at the same length.'),
          json: true,
          temperature: 0.85,
          maxTokens: 900,
        })
        const text = String(parseModelJSON(raw).text || '').trim()
        if (!text) return bad('The editor came back empty. Try again.')
        return NextResponse.json({ text })
      }

      case 'ideas': {
        if (index < 0 || index >= draftPages.length) return bad('Pick a page first.')
        const raw = await chat(apiKey, {
          system:
            'You are a warm, encouraging children’s book editor. Suggest small, concrete improvements a parent could ask for. Answer with ONLY a JSON object: {"ideas":["...","...","..."]}. Each idea is one short instruction of at most 10 words, written as a request (for example "Add a funny sound the dragon makes").',
          user: `The book is "${title}".\n\n${storySoFar}\n\nThree ideas for page ${index + 1}.`,
          json: true,
          temperature: 0.95,
          maxTokens: 300,
          timeoutMs: 45_000,
        })
        const ideas = (parseModelJSON(raw).ideas || []).map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
        return NextResponse.json({ ideas })
      }

      case 'repaint': {
        if (index < 0 || index >= draftPages.length) return bad('Pick a page first.')
        // The studio sends the page's own brief, which stays right after pages move.
        const brief = typeof body.scene === 'string' && body.scene.trim() ? body.scene.trim().slice(0, 1200) : draftPages[index] || sceneFor(index)
        const scene = [brief, instruction ? `Also: ${instruction}.` : ''].filter(Boolean).join(' ')
        const image = await paintPage(scene, meta.scenes?.[index]?.shotType)
        if (!image) return bad('The painter could not repaint this page just now. Please try again.', 502)
        return NextResponse.json({ image })
      }

      case 'touchup': {
        const source = typeof body.image === 'string' && body.image.startsWith('data:image/') ? body.image : book.pages[index]?.image
        if (!source || !instruction) return bad('Say what to change, for example "add a red balloon".')
        const img = await editImage(apiKey, {
          image: source,
          prompt: buildPageTouchUpPrompt(style, instruction),
          model: await resolveDefaultEditModel(apiKey),
          fallbacks: EDIT_MODEL_FALLBACKS,
        })
        if (!img) return bad('The painter could not make that change. Try saying it another way.', 502)
        return NextResponse.json({ image: img.dataUrl })
      }

      case 'newpage': {
        const after = Math.min(Math.max(index, -1), draftPages.length - 1)
        const raw = await chat(apiKey, {
          system:
            `You are an award-winning children's picture book author adding one page to a finished book. Keep the characters, voice and length of the other pages. Reading level: ${readingLevel}. Write the text in ${language}; write imageDescription in English. Answer with ONLY a JSON object: {"text":"the new page","imageDescription":"what the illustration shows: the characters, the setting, the action, the light","shotType":"wide establishing shot | medium shot | close-up"}.`,
          user:
            `The book is "${title}".\n\n${storySoFar}\n\nWrite a new page that goes ${after < 0 ? 'before page 1' : `right after page ${after + 1}`}, so the story flows into the page that follows it. ` +
            (instruction ? `The author wants this page to be about: ${instruction}` : ''),
          json: true,
          temperature: 0.9,
          maxTokens: 1200,
        })
        const parsed = parseModelJSON(raw)
        const text = String(parsed.text || '').trim()
        if (!text) return bad('The writer came back empty. Try again.')
        const scene = String(parsed.imageDescription || text).slice(0, 1200)
        const image = await paintPage(scene, parsed.shotType)
        if (!image) return bad('The words are ready but the painter is busy. Please try again.', 502)
        return NextResponse.json({ text, image, scene })
      }

      case 'cover': {
        const scene = [meta.scenes?.[0]?.imageDescription || draftPages[0] || '', instruction ? `Also: ${instruction}.` : '']
          .filter(Boolean).join(' ')
        let image: string | null = null
        if (meta.heroImage) {
          const img = await editImage(apiKey, {
            image: meta.heroImage,
            prompt: buildSceneWithHeroPrompt({ style, scene, heroName: meta.heroName, cover: true, title, palette: meta.visualBible?.colorPalette }),
            model: await resolveDefaultEditModel(apiKey),
            fallbacks: EDIT_MODEL_FALLBACKS,
            aspectRatio: '3:2',
          })
          image = img?.dataUrl || null
        }
        if (!image) {
          const img = await generateImage(apiKey, {
            prompt: buildCoverIllustrationPrompt({ style, scene, title, characters: heroLock || undefined, palette: meta.visualBible?.colorPalette }),
            model: meta.imageModel || (await resolveDefaultImageModel(apiKey)),
            width: 1248,
            height: 832,
            negativePrompt: KQ_COVER_NEGATIVE,
          })
          image = img?.dataUrl || null
        }
        if (!image) return bad('The painter could not make a new cover just now. Please try again.', 502)
        return NextResponse.json({ image })
      }

      default:
        return bad('Unknown studio action.')
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'The studio helper did not answer. Please try again.' }, { status: 502 })
  }
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}
