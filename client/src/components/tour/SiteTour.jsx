// src/components/tour/SiteTour.jsx
import React, { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { getFromStorage, setToStorage } from '../../utils/helpers'

const SiteTour = () => {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tourCompleted, setTourCompleted] = useState(false)
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 })
  const [currentTarget, setCurrentTarget] = useState(null)
  const [validSteps, setValidSteps] = useState([])
  const cardRef = useRef(null)
  const location = useLocation()

  const tourSteps = [
    {
      target: 'header',
      title: 'Welcome to Voice2Action!',
      content: 'Your platform for reporting and tracking civic issues. Let\'s take a quick tour to get you started.',
      position: 'bottom',
      id: 'header'
    },
    {
      target: '[href="/dashboard"]',
      title: 'Your Dashboard',
      content: 'Access your personalized dashboard with issue analytics, reporting forms, issue history, and community impact metrics.',
      position: 'bottom',
      id: 'dashboard'
    },
    {
      target: '[href="/issues"]',
      title: 'Browse Issues',
      content: 'Explore issues reported by other community members and show your support.',
      position: 'bottom',
      id: 'issues'
    },
    {
      target: '[href="/leaderboard"]',
      title: 'Leaderboard',
      content: 'See top contributors and track community impact metrics.',
      position: 'bottom',
      id: 'leaderboard'
    },
    {
      target: '.quick-report-btn',
      title: 'Quick Report Button',
      content: 'Fast access to report new civic issues with photos, videos, or voice recordings directly.',
      position: 'bottom',
      id: 'quick-report'
    },
    {
      target: '[href="/report"]',
      title: 'Report Issues Page',
      content: 'Access the full reporting form with advanced options for detailed issue submission.',
      position: 'bottom',
      id: 'report-page'
    },
    {
      target: '.notifications-dropdown button, button[aria-label*="Notifications"]',
      title: 'Notifications',
      content: 'Stay updated with real-time notifications about your reported issues, community updates, and system alerts.',
      position: 'bottom',
      id: 'notifications'
    },
    {
      target: '.user-profile-dropdown, .auth-buttons',
      title: 'Account Management',
      content: 'Manage your profile, settings, and view your contribution history.',
      position: 'bottom-left',
      id: 'profile'
    }
  ]

  // Only show floating button on home page
  const isHomePage = location.pathname === '/'

  useEffect(() => {
    const completed = getFromStorage('tour-completed', false)
    setTourCompleted(completed)
    
    // Auto-start tour for new users on home page only
    if (!completed && isHomePage) {
      const timer = setTimeout(() => {
        validateAndStartTour()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isHomePage])

  // Validate available steps when tour becomes active
  useEffect(() => {
    if (isActive) {
      validateAvailableSteps()
    }
  }, [isActive])

  useEffect(() => {
    if (isActive && validSteps.length > 0) {
      document.body.style.overflow = 'hidden'
      highlightElement(currentStep)
      calculateCardPosition(currentStep)
    } else {
      document.body.style.overflow = 'unset'
      removeHighlight()
    }

    const handleResize = () => {
      if (isActive && validSteps.length > 0) {
        calculateCardPosition(currentStep)
      }
    }

    const handleScroll = () => {
      if (isActive && validSteps.length > 0) {
        calculateCardPosition(currentStep)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)

    return () => {
      document.body.style.overflow = 'unset'
      removeHighlight()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isActive, currentStep, validSteps])

  const validateAvailableSteps = () => {
    const available = []
    
    tourSteps.forEach((step, index) => {
      const element = findTargetElement(step.target)
      if (element && isElementVisible(element)) {
        available.push({
          ...step,
          originalIndex: index,
          validIndex: available.length
        })
      }
    })
    
    setValidSteps(available)
    
    // If no valid steps, close tour
    if (available.length === 0) {
      setIsActive(false)
      return
    }
    
    // Reset to first valid step
    setCurrentStep(0)
  }

  const validateAndStartTour = () => {
    // First validate steps before starting
    const available = []
    
    tourSteps.forEach((step, index) => {
      const element = findTargetElement(step.target)
      if (element && isElementVisible(element)) {
        available.push({
          ...step,
          originalIndex: index,
          validIndex: available.length
        })
      }
    })
    
    if (available.length > 0) {
      setValidSteps(available)
      setCurrentStep(0)
      setIsActive(true)
    }
  }

  const isElementVisible = (element) => {
    if (!element) return false
    
    const rect = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetParent !== null &&
      rect.width > 0 &&
      rect.height > 0
    )
  }

  const findTargetElement = (target) => {
    // Handle special cases first
    if (target === 'header') {
      return document.querySelector('header')
    }
    
    // Try multiple selectors for flexibility
    const selectors = target.split(', ')
    
    for (const selector of selectors) {
      let element
      
      try {
        // Handle complex selectors
        if (selector.includes(':has(')) {
          // For :has() pseudo-selector, find parent elements
          if (selector.includes('.relative:has(img[src*="avatar"])')) {
            const avatarImg = document.querySelector('img[src*="avatar"]')
            if (avatarImg) {
              element = avatarImg.closest('.relative') || avatarImg.closest('button') || avatarImg
            }
          } else if (selector.includes('button:has(svg)')) {
            const buttons = document.querySelectorAll('button')
            for (const btn of buttons) {
              if (btn.querySelector('svg') && btn.textContent.includes('Report')) {
                element = btn
                break
              }
            }
          }
        } else {
          element = document.querySelector(selector.trim())
        }
        
        if (element) {
          return element
        }
      } catch (e) {
        // Continue to next selector if this one fails
        continue
      }
    }
    
    // Enhanced fallback searches
    if (target.includes('user-profile-dropdown') || target.includes('auth-buttons')) {
      // Look for profile dropdown container or auth buttons container
      return document.querySelector('.user-profile-dropdown') ||
             document.querySelector('.auth-buttons') ||
             document.querySelector('button[aria-label*="menu"]') ||
             document.querySelector('[href="/profile"]') ||
             document.querySelector('[href="/login"]')
    }
    
    if (target.includes('quick-report-btn')) {
      // Look for the quick report button specifically
      return document.querySelector('.quick-report-btn')
    }
    
    if (target.includes('notification')) {
      // Look for notifications button
      return document.querySelector('button[aria-label*="Notifications"]') ||
             document.querySelector('.notifications-dropdown button') ||
             document.querySelector('button[title*="notification"]') ||
             Array.from(document.querySelectorAll('button')).find(btn => 
               btn.querySelector('svg path[d*="M15 17h5l-3.405-3.405"]') // Bell icon path
             ) ||
             // Fallback to any button with a bell-like SVG
             Array.from(document.querySelectorAll('button')).find(btn => {
               const svg = btn.querySelector('svg')
               return svg && svg.innerHTML.includes('M15 17h5l-3.405')
             })
    } searches
    if (target.includes('avatar') || target.includes('menu')) {
      // Look for profile avatar or menu button with priority order
      return document.querySelector('img[src*="avatar"]') ||
             document.querySelector('img[alt*="name"]') ||
             document.querySelector('button[aria-label*="menu"]') ||
             document.querySelector('div.relative button img') ||
             document.querySelector('[href="/profile"]') ||
             document.querySelector('[href="/login"]')
    }
    
    if (target.includes('Report') || target.includes('quick-report')) {
      // Look for report button with better targeting
      return document.querySelector('button[title*="Report"]') ||
             document.querySelector('button:contains("Report")') ||
             document.querySelector('[href="/report"]') ||
             Array.from(document.querySelectorAll('button')).find(btn => 
               btn.textContent.includes('Report') && btn.querySelector('svg')
             )
    }
    
    return null
  }

  const calculateCardPosition = (stepIndex) => {
    if (stepIndex >= validSteps.length || !validSteps[stepIndex]) return
    
    const step = validSteps[stepIndex]
    const element = findTargetElement(step.target)
    
    if (!element || !cardRef.current) return
    
    const elementRect = element.getBoundingClientRect()
    const cardRect = cardRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    
    let top, left
    const margin = 20
    const arrowSize = 12
    
    // Calculate position based on preferred position
    switch (step.position) {
      case 'bottom':
        top = elementRect.bottom + margin + arrowSize
        left = elementRect.left + (elementRect.width / 2) - (cardRect.width / 2)
        break
        
      case 'top':
        top = elementRect.top - cardRect.height - margin - arrowSize
        left = elementRect.left + (elementRect.width / 2) - (cardRect.width / 2)
        break
        
      case 'left':
        top = elementRect.top + (elementRect.height / 2) - (cardRect.height / 2)
        left = elementRect.left - cardRect.width - margin - arrowSize
        break
        
      case 'right':
        top = elementRect.top + (elementRect.height / 2) - (cardRect.height / 2)
        left = elementRect.right + margin + arrowSize
        break
        
      case 'bottom-left':
        top = elementRect.bottom + margin + arrowSize
        left = elementRect.right - cardRect.width
        break
        
      case 'bottom-right':
        top = elementRect.bottom + margin + arrowSize
        left = elementRect.left
        break
        
      default:
        top = elementRect.bottom + margin + arrowSize
        left = elementRect.left + (elementRect.width / 2) - (cardRect.width / 2)
    }
    
    // Keep card within viewport bounds
    if (left < margin) {
      left = margin
    } else if (left + cardRect.width > viewportWidth - margin) {
      left = viewportWidth - cardRect.width - margin
    }
    
    if (top < margin) {
      // If doesn't fit below, try above
      top = elementRect.top - cardRect.height - margin - arrowSize
      if (top < margin) {
        // If doesn't fit above either, place at top with scroll
        top = margin
      }
    } else if (top + cardRect.height > viewportHeight - margin) {
      // Try placing above
      top = elementRect.top - cardRect.height - margin - arrowSize
      if (top < margin) {
        top = viewportHeight - cardRect.height - margin
      }
    }
    
    setCardPosition({ top, left })
  }

  const highlightElement = (stepIndex) => {
    removeHighlight()
    
    if (stepIndex >= validSteps.length || !validSteps[stepIndex]) return
    
    const step = validSteps[stepIndex]
    const element = findTargetElement(step.target)
    
    if (element && isElementVisible(element)) {
      // Store current target
      setCurrentTarget(element)
      
      // Scroll element into view first
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      })
      
      // Add highlight after scroll
      setTimeout(() => {
        if (isElementVisible(element)) {
          element.style.position = 'relative'
          element.style.zIndex = '9999'
          element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.4)'
          element.style.borderRadius = '8px'
          element.style.transition = 'all 0.3s ease'
          element.classList.add('tour-highlight')
          
          // Add pulsing animation
          element.style.animation = 'tour-pulse 2s infinite'
          
          // Recalculate position after scroll
          setTimeout(() => calculateCardPosition(stepIndex), 100)
        }
      }, 300)
    }
  }

  const removeHighlight = () => {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.style.position = ''
      el.style.zIndex = ''
      el.style.boxShadow = ''
      el.style.borderRadius = ''
      el.style.transition = ''
      el.style.animation = ''
      el.classList.remove('tour-highlight')
    })
    setCurrentTarget(null)
  }

  const nextStep = () => {
    if (currentStep < validSteps.length - 1) {
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
    if (isHomePage) {
      setCurrentStep(0)
      setToStorage('tour-completed', false)
      setTourCompleted(false)
      validateAndStartTour()
    }
  }

  // Add CSS for animations
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes tour-pulse {
        0% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.4), 0 0 30px rgba(59, 130, 246, 0.6); }
        100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.4); }
      }
      
      .tour-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        pointer-events: auto;
      }
      
      .tour-card {
        position: fixed;
        z-index: 10000;
        max-width: 400px;
        width: calc(100vw - 40px);
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
      }
      
      .tour-card::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 12px solid transparent;
        border-bottom-color: white;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        filter: drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.1));
      }
      
      .tour-card.position-top::before {
        top: auto;
        bottom: -24px;
        border-bottom-color: transparent;
        border-top-color: white;
        filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1));
      }
      
      .tour-card.position-left::before {
        top: 50%;
        left: auto;
        right: -24px;
        transform: translateY(-50%);
        border-bottom-color: transparent;
        border-left-color: white;
        filter: drop-shadow(2px 0 2px rgba(0, 0, 0, 0.1));
      }
      
      .tour-card.position-right::before {
        top: 50%;
        left: -24px;
        transform: translateY(-50%);
        border-bottom-color: transparent;
        border-right-color: white;
        filter: drop-shadow(-2px 0 2px rgba(0, 0, 0, 0.1));
      }
      
      .tour-card.position-bottom-left::before {
        left: 80%;
      }
      
      .tour-card.position-bottom-right::before {
        left: 20%;
      }
      
      @media (max-width: 640px) {
        .tour-card {
          max-width: calc(100vw - 20px);
          margin: 10px;
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  if (!isActive) {
    return (tourCompleted && isHomePage) ? (
      <button
        onClick={restartTour}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        title="Restart Tour"
      >
        <Play className="w-5 h-5" />
      </button>
    ) : null
  }

  // Safety check: if no valid steps, close tour
  if (validSteps.length === 0) {
    return null
  }

  const currentTourStep = validSteps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="tour-overlay" onClick={skipTour} />
      
      {/* Tour Card */}
      <div 
        ref={cardRef}
        className={`tour-card position-${currentTourStep.position}`}
        style={{
          top: `${cardPosition.top}px`,
          left: `${cardPosition.left}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 shadow-sm">
              {currentStep + 1}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentTourStep.title}
            </h3>
          </div>
          
          <button
            onClick={skipTour}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed text-base">
            {currentTourStep.content}
          </p>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Step {currentStep + 1} of {validSteps.length}</span>
              <span>{Math.round(((currentStep + 1) / validSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / validSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-b-xl border-t border-gray-100">
          <button
            onClick={skipTour}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Skip Tour
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            
            <button
              onClick={nextStep}
              className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {currentStep === validSteps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < validSteps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SiteTour