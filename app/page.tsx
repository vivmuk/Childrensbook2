'use client'

import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-400 font-display">
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-20"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDuqyg_Asjsvty0tzYyB8sHQMgmo8HxFMLBQkGxQ-YWrQd1H1C1hxlO9XQItRXtU3EqZsQREdO9LJ1Ie7H7WYMP5aY0A31jbZ9fsQVUWafv3bcsJ2whAAhxcmp7zZRKazVaD0ztLi_Pa-WeiXQeu9dpTFGKAvYwQLkCSfGZsKpVYIV2_LJnapPvyM_ynHNh5ZLTEyFXmqQ7qiPO0r69pIRPgGl0Hvol7tSFTSihOnxUAMj6kg-mJc-LWCdbo2kREVe5bROQ3mGCNA")',
        }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-between px-4 py-12 text-center">
        <div className="flex-shrink-0" />
        <div className="flex flex-grow flex-col items-center justify-center">
          <div className="mb-6">
            <div className="rounded-full bg-white/20 backdrop-blur-md p-6 shadow-2xl">
              <span className="material-symbols-outlined text-7xl text-white">
                auto_stories
              </span>
            </div>
          </div>
          <h1 className="px-4 pb-4 text-center font-display text-5xl font-bold text-white drop-shadow-lg">
            KinderQuill
          </h1>
          <p className="max-w-md px-4 pb-6 text-center font-display text-xl font-medium leading-relaxed text-white/90 drop-shadow-md">
            Create magical, personalized storybooks for your little ones.
          </p>
        </div>
        <div className="flex w-full max-w-md flex-shrink-0 flex-col items-center">
          <button
            onClick={() => router.push('/generate')}
            className="w-full rounded-2xl bg-white px-8 py-4 font-display text-lg font-bold text-purple-600 shadow-2xl transition-all hover:scale-105 hover:shadow-3xl active:scale-95"
          >
            ✨ Start Your Story ✨
          </button>
          <p className="mt-4 cursor-pointer text-center font-display text-sm font-medium text-white/80 underline hover:text-white transition-colors">
            How does it work?
          </p>
        </div>
      </div>
    </div>
  )
}

