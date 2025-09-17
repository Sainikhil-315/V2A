// src/components/tour/SiteTour.jsx
import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { getFromStorage, setToStorage } from '../../utils/helpers'

const SiteTour = () => {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tourCompleted, setTourCompleted] = useState(false)

  const tourSteps = [
    {
      target: 'header',
      title: 'Welcome to Voice2Action!',
      content: 'Your platform for reporting and tracking civic issues. Let\'s take a quick tour to get you started.',
      position: 'bottom'
    },
    {
      target: '[href="/report"]',
      title: 'Report Issues',
      content: 'Click here to report new civic issues with photos, videos, or voice recordings.',
      position: 'bottom'
    },
    {
      target: '[href="/dashboard"]',
      title: 'Your Dashboard',
      content: 'Track your reported issues, view community stats, and see your contribution ranking.',
      position: 'bottom'
    },
    {
      target: '[href="/issues"]',
      title: 'Browse Issues',
      content: 'Explore issues reported by other community members and show your support.',
      position: 'bottom'
    },
    {
      target: '[href="/leaderboard"]',
      title: 'Leaderboard',
      content: 'See top contributors and track community impact metrics.',
      position: 'bottom'
    },
    {
      target: '.user-profile, .auth-buttons',
      title: 'Account Management',
      content: 'Manage your profile, settings, and view your contribution history.',
      position: 'bottom'
    }
  ]

  useEffect(() => {
    const completed = getFromStorage('tour-completed', false)
    setTourCompleted(completed)
    
    // Auto-start tour for new users
    if (!completed && window.location.pathname === '/') {
      setTimeout(() => setIsActive(true), 1000)
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden'
      highlightElement(currentStep)
    } else {
      document.body.style.overflow = 'unset'
      removeHighlight()
    }

    return () => {
      document.body.style.overflow = 'unset'
      removeHighlight()
    }
  }, [isActive, currentStep])

  const highlightElement = (stepIndex) => {
    removeHighlight()
    
    if (stepIndex >= tourSteps.length) return
    
    const target = tourSteps[stepIndex].target
    let element
    
    if (target === 'header') {
      element = document.querySelector('header')
    } else if (target.includes('auth-buttons')) {
      element = document.querySelector('.auth-buttons') || document.querySelector('[href="/login"]')?.parentElement
    } else if (target.includes('user-profile')) {
      element = document.querySelector('.user-profile') || document.querySelector('[aria-label="User menu"]')
    } else {
      element = document.querySelector(target)
    }
    
    if (element) {
      element.style.position = 'relative'
      element.style.zIndex = '1001'
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
      element.style.borderRadius = '8px'
      element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.3)'
      element.classList.add('tour-highlight')
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const removeHighlight = () => {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.style.position = ''
      el.style.zIndex = ''
      el.style.backgroundColor = ''
      el.style.borderRadius = ''
      el.style.boxShadow = ''
      el.classList.remove('tour-highlight')
    })
  }

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const skipTour = () => {
    setIsActive(false)
    setToStorage('tour-completed', true)
    setTourCompleted(true)
  }

  const completeTour = () => {
    setIsActive(false)
    setToStorage('tour-completed', true)
    setTourCompleted(true)
    removeHighlight()
  }

  const restartTour = () => {
    setCurrentStep(0)
    setIsActive(true)
    setToStorage('tour-completed', false)
    setTourCompleted(false)
  }

  if (!isActive) {
    return tourCompleted ? (
      <button
        onClick={restartTour}
        className="fixed bottom-4 right-4 z-50 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Restart Tour"
      >
        <Play className="w-5 h-5" />
      </button>
    ) : null
  }

  const currentTourStep = tourSteps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-1000" />
      
      {/* Tour Card */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-1001 bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              {currentStep + 1}
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {currentTourStep.title}
            </h3>
          </div>
          
          <button
            onClick={skipTour}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">
            {currentTourStep.content}
          </p>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Step {currentStep + 1} of {tourSteps.length}</span>
              <span>{Math.round(((currentStep + 1) / tourSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={skipTour}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Skip Tour
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            
            <button
              onClick={nextStep}
              className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < tourSteps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SiteTour