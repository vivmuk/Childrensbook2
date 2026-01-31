'use client'

import { useState } from 'react'
import { Icon } from './Icons'

const TOUR_STEPS = [
  {
    icon: 'edit_note',
    title: '1. Dream Up Your Story',
    description: 'Choose a template or write your own idea. Add a custom character with unique traits!',
    color: 'from-blue-400 to-blue-600',
  },
  {
    icon: 'auto_awesome',
    title: '2. AI Magic',
    description: 'Our AI crafts a beautiful story with illustrations tailored to your choices.',
    color: 'from-purple-400 to-purple-600',
  },
  {
    icon: 'menu_book',
    title: '3. Read & Share',
    description: 'Enjoy your book, listen to the narration, and share it with friends and family!',
    color: 'from-pink-400 to-pink-600',
  },
]

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">How KinderQuill Works</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress */}
          <div className="flex justify-center gap-2 mb-6">
            {TOUR_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-purple-500'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="text-center">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${TOUR_STEPS[currentStep].color} flex items-center justify-center shadow-lg`}>
              <Icon 
                name={TOUR_STEPS[currentStep].icon as any} 
                className="text-white" 
                size={40} 
              />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
              {TOUR_STEPS[currentStep].title}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              {TOUR_STEPS[currentStep].description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              Previous
            </button>
            
            {currentStep < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-6 py-2 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 transition-all flex items-center gap-2"
              >
                Next
                <Icon name="arrow_forward" size={18} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transition-all"
              >
                Start Creating!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
