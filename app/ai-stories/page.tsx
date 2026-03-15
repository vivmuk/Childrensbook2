'use client'

import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icons'

interface AITopic {
  id: string
  emoji: string
  title: string
  description: string
  storyIdea: string
  ageRange: string
  illustrationStyle: string
  color: string
  badgeColor: string
  badgeTextColor: string
  concept: string
}

const AI_TOPICS: AITopic[] = [
  {
    id: 'what-is-ai',
    emoji: '🤖',
    title: 'What is AI?',
    description: 'Meet Byte, a curious little robot who helps people by learning from examples — just like how you learn to ride a bike!',
    storyIdea: 'A friendly little robot named Byte discovers they can learn new things by watching and practicing, just like children do. Byte wants to help the whole town and figures out that the more examples they see, the smarter they get. Tell a warm, exciting story explaining what artificial intelligence is through Byte\'s adventures learning to bake cookies, sort colourful blocks, and finally help a lost puppy find its way home.',
    ageRange: '2nd',
    illustrationStyle: 'ghibli',
    color: 'from-blue-400 to-cyan-500',
    badgeColor: 'bg-blue-100',
    badgeTextColor: 'text-blue-700',
    concept: 'Artificial Intelligence',
  },
  {
    id: 'how-robots-learn',
    emoji: '🧠',
    title: 'How Do Robots Learn?',
    description: 'Sparky the robot practices painting every single day. Each mistake makes Sparky a tiny bit better — that\'s machine learning!',
    storyIdea: 'A young robot named Sparky wants to paint beautiful pictures but keeps making mistakes at first. Each time Sparky paints, they look at what went wrong and try again. Through a fun story with colourful scenes, explain machine learning — how computers get better at tasks by trying over and over and learning from their errors, just like how children learn to draw, write, or play sports.',
    ageRange: '3rd',
    illustrationStyle: 'watercolor',
    color: 'from-purple-400 to-violet-500',
    badgeColor: 'bg-purple-100',
    badgeTextColor: 'text-purple-700',
    concept: 'Machine Learning',
  },
  {
    id: 'neural-networks',
    emoji: '✨',
    title: 'Inside a Robot\'s Brain',
    description: 'Hundreds of tiny helpers pass notes to each other inside a robot\'s brain. Together they solve big puzzles — that\'s a neural network!',
    storyIdea: 'Inside a magical robot city called NeuralVille, thousands of tiny helpers called Neurons live in connected towers. When the city gets a question, neurons pass glowing messages to each other until the answer lights up at the end. Tell a colourful, imaginative story explaining neural networks — how many simple connected parts working together can recognise a cat in a photo or understand what someone is saying.',
    ageRange: '4th',
    illustrationStyle: 'ghibli',
    color: 'from-pink-400 to-rose-500',
    badgeColor: 'bg-pink-100',
    badgeTextColor: 'text-pink-700',
    concept: 'Neural Networks',
  },
  {
    id: 'generative-ai',
    emoji: '🎨',
    title: 'AI That Creates Things',
    description: 'Imagine an AI friend who can paint a dragon on a rainbow just because you described it. That\'s Generative AI!',
    storyIdea: 'A creative AI called Iris lives inside a magical paintbox. When children whisper descriptions to Iris — "a purple elephant flying over a cupcake city" — Iris imagines it and paints it instantly. Tell a wonder-filled story about a child and Iris creating an entire storybook together, explaining generative AI: how modern AI can create new pictures, music, stories, and ideas from descriptions people give it.',
    ageRange: '2nd',
    illustrationStyle: 'watercolor',
    color: 'from-orange-400 to-amber-500',
    badgeColor: 'bg-orange-100',
    badgeTextColor: 'text-orange-700',
    concept: 'Generative AI',
  },
  {
    id: 'large-language-models',
    emoji: '📚',
    title: 'The Story-Knowing Genie',
    description: 'A genie read millions of books and can now chat, answer questions, and tell stories. That\'s a Large Language Model!',
    storyIdea: 'Deep inside a magical library, a wise Genie has read every book ever written — billions of words, millions of stories. Now the Genie can answer questions, finish sentences, and chat with anyone. A curious child named Maya visits the library and asks the Genie how it knows so much. Tell a story explaining large language models in a fun, magical way — how AI reads enormous amounts of text and learns patterns to understand and create language.',
    ageRange: '4th',
    illustrationStyle: 'american-classic',
    color: 'from-emerald-400 to-teal-500',
    badgeColor: 'bg-emerald-100',
    badgeTextColor: 'text-emerald-700',
    concept: 'Large Language Models',
  },
  {
    id: 'computer-vision',
    emoji: '👀',
    title: 'Robots That See',
    description: 'Lens the robot has a camera eye and practises looking at thousands of cats, dogs, and flowers until it can spot them anywhere!',
    storyIdea: 'A young robot called Lens has a special camera eye but at first can\'t tell a cat from a dog, or a red apple from a red ball. Lens trains every day, looking at thousands of pictures until the shapes, colours, and patterns start to make sense. Tell a fun, adventurous story explaining computer vision — how AI learns to understand images just like a child slowly learns to recognise shapes, faces, and objects.',
    ageRange: '3rd',
    illustrationStyle: 'american-classic',
    color: 'from-sky-400 to-blue-500',
    badgeColor: 'bg-sky-100',
    badgeTextColor: 'text-sky-700',
    concept: 'Computer Vision',
  },
  {
    id: 'ai-creativity',
    emoji: '🎵',
    title: 'AI and Human Creativity',
    description: 'When a young artist teams up with an AI friend, together they make music and art that neither could make alone!',
    storyIdea: 'Young Zara loves to draw but can\'t think of ideas. Her AI friend Muse helps by suggesting wild, unexpected combinations — "what about a jazz-playing octopus in space?" Together they create an incredible art exhibition. Tell a joyful, inspiring story showing how AI and human creativity work best as partners: humans bring feelings, dreams, and meaning, while AI offers endless ideas and possibilities. Celebrate what makes human creativity special.',
    ageRange: '2nd',
    illustrationStyle: 'watercolor',
    color: 'from-violet-400 to-purple-600',
    badgeColor: 'bg-violet-100',
    badgeTextColor: 'text-violet-700',
    concept: 'AI & Creativity',
  },
  {
    id: 'ai-safety',
    emoji: '🛡️',
    title: 'Keeping AI Kind & Safe',
    description: 'Good AI helpers are honest, helpful, and safe. Learn why teaching robots good values matters for everyone!',
    storyIdea: 'In a friendly town, different AI robots help with different jobs. One day a new robot starts giving wrong answers to seem popular. The town\'s children must teach it the three golden rules: be honest, be helpful, and never cause harm. Tell a warm, thoughtful story explaining AI safety for children — why it is important for AI to have good values, why humans need to check AI\'s work, and how everyone can help make AI trustworthy.',
    ageRange: '3rd',
    illustrationStyle: 'ghibli',
    color: 'from-green-400 to-emerald-500',
    badgeColor: 'bg-green-100',
    badgeTextColor: 'text-green-700',
    concept: 'AI Safety',
  },
  {
    id: 'data-and-privacy',
    emoji: '🔒',
    title: 'Data: The Food AI Eats',
    description: 'AI learns from data — but data is private and must be kept safe, like a secret diary. Let\'s find out why!',
    storyIdea: 'AI robots eat a special food called Data to grow smarter. But data is made from real people\'s information — their names, photos, and stories — and must be treated with great care and respect. A young girl named Priya discovers her favourite app is collecting her drawings without asking. Tell a gentle, empowering story explaining what data and privacy mean for children: what AI needs to learn, why your personal information is precious, and how to stay safe online.',
    ageRange: '4th',
    illustrationStyle: 'tintin',
    color: 'from-yellow-400 to-orange-400',
    badgeColor: 'bg-yellow-100',
    badgeTextColor: 'text-yellow-700',
    concept: 'Data & Privacy',
  },
  {
    id: 'future-of-ai',
    emoji: '🚀',
    title: 'The Future with AI',
    description: 'A child from the future visits to share amazing AI inventions — and tells us that the best ideas still come from curious humans like you!',
    storyIdea: 'A child named Nova arrives in a time capsule from 100 years in the future. Nova describes a world where AI doctors catch illnesses early, AI teachers personalise lessons for every child, and AI scientists help solve climate change. But Nova also explains that the most important thing never changed: curious, caring humans asking the right questions and making good choices. Tell an exciting, hopeful story about the future of AI that inspires children to dream big and get involved.',
    ageRange: '3rd',
    illustrationStyle: 'ghibli',
    color: 'from-indigo-400 to-blue-600',
    badgeColor: 'bg-indigo-100',
    badgeTextColor: 'text-indigo-700',
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
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 font-display dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <Header title="AI Stories for Kids" />

      <main className="flex grow flex-col items-center px-4 py-6 max-w-5xl mx-auto w-full">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🤖✨</div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">
            Explore AI &amp; GenAI Through Stories
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-4">
            Each book explains a real AI concept — machine learning, neural networks, generative AI, and more —
            using fun characters that kids ages 5–12 will love.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {['Artificial Intelligence', 'Machine Learning', 'Neural Networks', 'Generative AI', 'AI Safety'].map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 text-gray-700 dark:text-gray-300 font-medium shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Topic Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {AI_TOPICS.map((topic) => (
            <div
              key={topic.id}
              className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg transition-all hover:scale-[1.02] flex flex-col shadow-sm"
            >
              {/* Card Header */}
              <div className={`h-24 bg-gradient-to-br ${topic.color} flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_white_0%,_transparent_70%)]" />
                <span className="text-5xl drop-shadow-lg">{topic.emoji}</span>
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight">{topic.title}</h3>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${topic.badgeColor} ${topic.badgeTextColor}`}>
                    {topic.concept}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed mb-4 flex-1">
                  {topic.description}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Best for: {topic.ageRange === 'kindergarten' ? 'Kindergarten' : `${topic.ageRange} Grade`}
                  </span>
                  <button
                    onClick={() => handleGenerate(topic)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    <Icon name="auto_awesome" size={14} />
                    Generate Story
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            Want a different AI topic? Create your own custom story!
          </p>
          <button
            onClick={() => router.push('/generate')}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            Create Custom AI Story
          </button>
        </div>
      </main>

      <footer className="w-full py-3 text-center border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Created with <span className="font-semibold text-purple-600 dark:text-purple-400">Venice.ai</span>
        </p>
      </footer>
    </div>
  )
}
