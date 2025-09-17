// src/pages/Home.jsx
import React, { useState, useEffect } from 'react'
import { 
  ArrowRight, 
  Play, 
  CheckCircle, 
  Users, 
  TrendingUp,
  Mic,
  Camera,
  MapPin,
  Bell,
  Star,
  Quote
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { issuesAPI, leaderboardAPI } from '../utils/api'
import { formatNumber } from '../utils/helpers'

const Home = () => {
  const { isAuthenticated } = useAuth()
  const [stats, setStats] = useState(null)
  const [topContributors, setTopContributors] = useState([])

  useEffect(() => {
    loadHomeData()
  }, [])

  const loadHomeData = async () => {
    try {
      const [statsResponse, leaderboardResponse] = await Promise.all([
        issuesAPI.getStats(),
        leaderboardAPI.getMonthly({ limit: 3 })
      ])
      
      setStats(statsResponse.data)
      setTopContributors(leaderboardResponse.data.leaderboard)
    } catch (error) {
      console.error('Error loading home data:', error)
    }
  }

  const features = [
    {
      icon: Camera,
      title: 'Multi-Media Reporting',
      description: 'Report issues with photos, videos, or voice recordings for better clarity'
    },
    {
      icon: MapPin,
      title: 'GPS Location Tagging',
      description: 'Automatically tag locations or select precise spots on the map'
    },
    {
      icon: Bell,
      title: 'Real-Time Updates',
      description: 'Get instant notifications when your issues are being addressed'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Monitor the status of your reports from submission to resolution'
    }
  ]

  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Community Leader',
      content: 'Voice2Action has transformed how we handle civic issues in our locality. The response time has improved dramatically!',
      avatar: null
    },
    {
      name: 'Rajesh Kumar',
      role: 'Local Resident',
      content: 'I love how easy it is to report problems and track their progress. The voice recording feature is incredibly convenient.',
      avatar: null
    },
    {
      name: 'Municipal Officer',
      role: 'Government Official',
      content: 'This platform has streamlined our issue management process and improved citizen satisfaction significantly.',
      avatar: null
    }
  ]

  const howItWorks = [
    {
      step: 1,
      title: 'Report Issue',
      description: 'Take a photo, record voice note, or write about the civic issue you encountered'
    },
    {
      step: 2,
      title: 'Admin Reviews',
      description: 'Our team verifies the issue and forwards it to the appropriate authority'
    },
    {
      step: 3,
      title: 'Authority Acts',
      description: 'Local authorities receive notification and begin working on the resolution'
    },
    {
      step: 4,
      title: 'Track Progress',
      description: 'Get real-time updates on the status until the issue is completely resolved'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                Voice Your 
                <span className="text-yellow-300"> Civic </span>
                Concerns
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                Report civic issues with photos, videos, and voice recordings. 
                Track progress in real-time and help improve your community.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {!isAuthenticated ? (
                  <>
                    
                    <a href="/register"
                      className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                    <button className="inline-flex items-center px-8 py-4 border-2 border-white hover:bg-white hover:text-primary-600 text-white font-semibold rounded-lg transition-colors">
                      <Play className="mr-2 w-5 h-5" />
                      Watch Demo
                    </button>
                  </>
                ) : (
                  
                  <a href="/report"
                    className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
                  >
                    Report Issue Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                )}
              </div>
              
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-blue-400">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-300">
                      {formatNumber(stats.totalIssues)}
                    </div>
                    <div className="text-blue-200 text-sm">Issues Reported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-300">
                      {formatNumber(stats.resolvedIssues)}
                    </div>
                    <div className="text-blue-200 text-sm">Issues Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-300">
                      {stats.totalIssues ? Math.round((stats.resolvedIssues / stats.totalIssues) * 100) : 0}%
                    </div>
                    <div className="text-blue-200 text-sm">Success Rate</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 border border-white border-opacity-20">
                <h3 className="text-2xl font-bold mb-6">Quick Report</h3>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg">
                    <Camera className="w-6 h-6 mr-3" />
                    <span>Take a photo of the issue</span>
                  </div>
                  <div className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg">
                    <Mic className="w-6 h-6 mr-3" />
                    <span>Record a voice description</span>
                  </div>
                  <div className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg">
                    <MapPin className="w-6 h-6 mr-3" />
                    <span>Auto-detect location</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How Voice2Action Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple, fast, and effective way to report and resolve civic issues in your community
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
                
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 transform translate-x-1/2">
                    <ArrowRight className="w-6 h-6 text-primary-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Civic Engagement
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to effectively report, track, and resolve community issues
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Road Pothole Report</h4>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Resolved
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-lg h-32 mb-4 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Large pothole causing traffic issues on Main Street...
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="w-3 h-3 mr-1" />
                    Main Street, Bhimavaram
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Contributors */}
      {topContributors?.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Community Champions
              </h2>
              <p className="text-xl text-gray-600">
                Recognizing our top contributors who are making a difference
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {topContributors.map((contributor, index) => (
                <div key={contributor.id} className="bg-white rounded-xl p-6 text-center shadow-sm border">
                  <div className="relative mb-4">
                    {contributor.avatar ? (
                      <img
                        src={contributor.avatar}
                        alt={contributor.name}
                        className="w-16 h-16 rounded-full mx-auto object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto flex items-center justify-center">
                        <Users className="w-8 h-8 text-primary-600" />
                      </div>
                    )}
                    <div className="absolute -top-2 -right-2">
                      {index === 0 && <Star className="w-6 h-6 text-yellow-500" />}
                      {index === 1 && <Star className="w-6 h-6 text-gray-400" />}
                      {index === 2 && <Star className="w-6 h-6 text-amber-600" />}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {contributor.name}
                  </h3>
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {formatNumber(contributor.points)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {contributor.issueCount} issues reported
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-8">
              
               <a href="/leaderboard"
                className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
              >
                View Full Leaderboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Community Says
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from real people making a difference
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border">
                <Quote className="w-8 h-8 text-primary-200 mb-4" />
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  {testimonial.avatar ? (
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of citizens who are actively improving their communities through Voice2Action
          </p>
          
          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              
              <a href="/register"
                className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
              >
                Start Reporting Issues
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              
              <a href="/login"
                className="inline-flex items-center px-8 py-4 border-2 border-white hover:bg-white hover:text-primary-600 text-white font-semibold rounded-lg transition-colors"
              >
                Sign In
              </a>
            </div>
          ) : (
            
            <a href="/report"
              className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-lg transition-colors shadow-lg"
            >
              Report Your First Issue
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home