'use client'

import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icons'

interface AITopic {
  id: string
  title: string
  description: string
  storyIdea: string
  ageRange: string
  illustrationStyle: string
  concept: string
}

// One story per AI idea. The emoji tiles and neon gradients that used to head
// each card are gone: the night palette and a single amber action carry the
// page now.
const AI_TOPICS: AITopic[] = [
  {
    id: 'what-is-ai',
    title: 'What is AI?',
    description: 'Meet Byte, a curious little robot who helps people by learning from examples, just like how you learn to ride a bike!',
    storyIdea: 'A friendly little robot named Byte discovers they can learn new things by watching and practicing, just like children do. Byte wants to help the whole town and figures out that the more examples they see, the smarter they get. Tell a warm, exciting story explaining what artificial intelligence is through Byte’s adventures learning to bake cookies, sort colourful blocks, and finally help a lost puppy find its way home.',
    ageRange: '2nd',
    illustrationStyle: 'ghibli',
    concept: 'Artificial Intelligence',
  },
  {
    id: 'how-robots-learn',
    title: 'How Do Robots Learn?',
    description: 'Sparky the robot practices painting every single day. Each mistake makes Sparky a tiny bit better, that’s machine learning!',
    storyIdea: 'A young robot named Sparky wants to paint beautiful pictures but keeps making mistakes at first. Each time Sparky paints, they look at what went wrong and try again. Through a fun story with colourful scenes, explain machine learning: how computers get better at tasks by trying over and over and learning from their errors, just like how children learn to draw, write, or play sports.',
    ageRange: '3rd',
    illustrationStyle: 'watercolor',
    concept: 'Machine Learning',
  },
  {
    id: 'neural-networks',
    title: 'Inside a Robot’s Brain',
    description: 'Hundreds of tiny helpers pass notes to each other inside a robot’s brain. Together they solve big puzzles, that’s a neural network!',
    storyIdea: 'Inside a magical robot city called NeuralVille, thousands of tiny helpers called Neurons live in connected towers. When the city gets a question, neurons pass glowing messages to each other until the answer lights up at the end. Tell a colourful, imaginative story explaining neural networks: how many simple connected parts working together can recognise a cat in a photo or understand what someone is saying.',
    ageRange: '4th',
    illustrationStyle: 'ghibli',
    concept: 'Neural Networks',
  },
  {
    id: 'generative-ai',
    title: 'AI That Creates Things',
    description: 'Imagine an AI friend who can paint a dragon on a rainbow just because you described it. That’s Generative AI!',
    storyIdea: 'A creative AI called Iris lives inside a magical paintbox. When children whisper descriptions to Iris, such as "a purple elephant flying over a cupcake city", Iris imagines it and paints it instantly. Tell a wonder-filled story about a child and Iris creating an entire storybook together, explaining generative AI: how modern AI can create new pictures, music, stories, and ideas from descriptions people give it.',
    ageRange: '2nd',
    illustrationStyle: 'watercolor',
    concept: 'Generative AI',
  },
  {
    id: 'large-language-models',
    title: 'The Story-Knowing Genie',
    description: 'A genie read millions of books and can now chat, answer questions, and tell stories. That’s a Large Language Model!',
    storyIdea: 'Deep inside a magical library, a wise Genie has read every book ever written, billions of words, millions of stories. Now the Genie can answer questions, finish sentences, and chat with anyone. A curious child named Maya visits the library and asks the Genie how it knows so much. Tell a story explaining large language models in a fun, magical way: how AI reads enormous amounts of text and learns patterns to understand and create language.',
    ageRange: '4th',
    illustrationStyle: 'american-classic',
    concept: 'Large Language Models',
  },
  {
    id: 'computer-vision',
    title: 'Robots That See',
    description: 'Lens the robot has a camera eye and practises looking at thousands of cats, dogs, and flowers until it can spot them anywhere!',
    storyIdea: 'A young robot called Lens has a special camera eye but at first can’t tell a cat from a dog, or a red apple from a red ball. Lens trains every day, looking at thousands of pictures until the shapes, colours, and patterns start to make sense. Tell a fun, adventurous story explaining computer vision: how AI learns to understand images just like a child slowly learns to recognise shapes, faces, and objects.',
    ageRange: '3rd',
    illustrationStyle: 'american-classic',
    concept: 'Computer Vision',
  },
  {
    id: 'ai-creativity',
    title: 'AI and Human Creativity',
    description: 'When a young artist teams up with an AI friend, together they make music and art that neither could make alone!',
    storyIdea: 'Young Zara loves to draw but can’t think of ideas. Her AI friend Muse helps by suggesting wild, unexpected combinations, such as "what about a jazz-playing octopus in space?" Together they create an incredible art exhibition. Tell a joyful, inspiring story showing how AI and human creativity work best as partners: humans bring feelings, dreams, and meaning, while AI offers endless ideas and possibilities. Celebrate what makes human creativity special.',
    ageRange: '2nd',
    illustrationStyle: 'watercolor',
    concept: 'AI & Creativity',
  },
  {
    id: 'ai-safety',
    title: 'Keeping AI Kind & Safe',
    description: 'Good AI helpers are honest, helpful, and safe. Learn why teaching robots good values matters for everyone!',
    storyIdea: 'In a friendly town, different AI robots help with different jobs. One day a new robot starts giving wrong answers to seem popular. The town’s children must teach it the three golden rules: be honest, be helpful, and never cause harm. Tell a warm, thoughtful story explaining AI safety for children: why it is important for AI to have good values, why humans need to check AI’s work, and how everyone can help make AI trustworthy.',
    ageRange: '3rd',
    illustrationStyle: 'ghibli',
    concept: 'AI Safety',
  },
  {
    id: 'data-and-privacy',
    title: 'Data: The Food AI Eats',
    description: 'AI learns from data, but data is private and must be kept safe, like a secret diary. Let’s find out why!',
    storyIdea: 'AI robots eat a special food called Data to grow smarter. But data is made from real people’s information, their names, photos, and stories, and must be treated with great care and respect. A young girl named Priya discovers her favourite app is collecting her drawings without asking. Tell a gentle, empowering story explaining what data and privacy mean for children: what AI needs to learn, why your personal information is precious, and how to stay safe online.',
    ageRange: '4th',
    illustrationStyle: 'tintin',
    concept: 'Data & Privacy',
  },
  {
    id: 'future-of-ai',
    title: 'The Future with AI',
    description: 'A child from the future visits to share amazing AI inventions, and tells us that the best ideas still come from curious humans like you!',
    storyIdea: 'A child named Nova arrives in a time capsule from 100 years in the future. Nova describes a world where AI doctors catch illnesses early, AI teachers personalise lessons for every child, and AI scientists help solve climate change. But Nova also explains that the most important thing never changed: curious, caring humans asking the right questions and making good choices. Tell an exciting, hopeful story about the future of AI that inspires children to dream big and get involved.',
    ageRange: '3rd',
    illustrationStyle: 'ghibli',
    concept: 'Future of AI',
  },
]

export default function AIStoriesPage() {
  const router = useRouter()

  const handleGenerate = (topic: AITopic) => {
    const params = new URLSearchParams({
      idea: topic.storyIdea,
      ageRange: topic.ageRange,
      illustrationStyle: topic.illustrationStyle,
    })
    router.push(`/generate?${params.toString()}`)
  }

  return (
    <div className="kq-ground kq-stars-bg relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <Header title="AI Stories for Kids" />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl grow flex-col px-4 py-6">
        {/* Page intro */}
        <div className="mb-8 text-center">
          <div className="kq-eyebrow mb-3">AI stories for kids</div>
          <h1 className="font-display text-3xl leading-tight text-kq-text sm:text-4xl">
            Understand AI through stories
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-kq-dim">
            Each book explains one real idea, from machine learning to neural networks,
            with characters children ages 5 to 12 can follow.
          </p>
        </div>

        {/* Topic cards */}
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AI_TOPICS.map((topic) => (
            <div key={topic.id} className="kq-card flex flex-col">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="kq-chip">{topic.concept}</span>
                <span className="text-xs text-kq-dim">
                  Best for {topic.ageRange === 'kindergarten' ? 'Kindergarten' : `${topic.ageRange} Grade`}
                </span>
              </div>

              <h3 className="mb-2 font-display text-lg leading-snug text-kq-text">{topic.title}</h3>

              <p className="mb-4 flex-1 text-sm leading-relaxed text-kq-dim">{topic.description}</p>

              {/* Quiet action: the one amber control is saved for the call to
                  action below. Sized with a style rule because
                  .kq-btn-secondary is full width by default. */}
              <button
                onClick={() => handleGenerate(topic)}
                className="kq-btn-secondary"
                style={{ width: 'auto', padding: '9px 16px', fontSize: '0.85rem' }}
              >
                <Icon name="auto_awesome" size={14} />
                Generate story
              </button>
            </div>
          ))}
        </div>

        {/* The one amber action on this screen */}
        <div className="mt-10 text-center">
          <p className="mb-3 text-sm text-kq-dim">Want a different topic? Start from your own idea.</p>
          <button
            onClick={() => router.push('/generate')}
            className="kq-btn-primary mx-auto max-w-sm"
          >
            Create custom AI story
          </button>
        </div>
      </main>

      <footer className="relative z-10 w-full border-t border-kq-line px-4 py-5 text-center">
        <p className="text-xs text-kq-dim">
          Painted with <span className="text-kq-text">Venice.ai</span>. Your ideas stay yours.
        </p>
      </footer>
    </div>
  )
}
