// src/components/user/UserDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  MessageSquare,
  ThumbsUp,
  Trophy,
  Target,
  Calendar
} from 'lucide-react'
import { issuesAPI, leaderboardAPI } from '../../utils/api'
import { formatRelativeTime, getStatusColor, getCategoryInfo } from '../../utils/helpers'
import Loader, { SkeletonLoader } from '../common/Loader'
import IssueCard from './IssueCard'

const UserDashboard = () => {
  const { user } = useAuth()
  const { isConnected } = useSocket()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentIssues, setRecentIssues] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [activities, setActivities] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [issuesResponse, rankResponse, userIssuesResponse] = await Promise.all([
        issuesAPI.getStats(),
        leaderboardAPI.getUserHistory(user.id),
        issuesAPI.getMyIssues({ limit: 5, sort: '-createdAt' })
      ])

      setStats(issuesResponse.data)
      setUserRank(rankResponse.data)
      setRecentIssues(userIssuesResponse.data.issues)
      
      // Mock activities - in real app, this would come from API
      setActivities([
        {
          id: 1,
          type: 'issue_created',
          title: 'Reported pothole on Main Street',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          icon: Plus,
          color: 'blue'
        },
        {
          id: 2,
          type: 'issue_resolved',
          title: 'Street light issue marked as resolved',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          icon: CheckCircle,
          color: 'green'
        },
        {
          id: 3,
          type: 'comment_added',
          title: 'Received update on garbage collection issue',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          icon: MessageSquare,
          color: 'blue'
        }
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickStats = [
    {
      title: 'Issues Reported',
      value: userRank?.totalIssues || 0,
      icon: Plus,
      color: 'blue',
      change: '+2 this month'
    },
    {
      title: 'Issues Resolved',
      value: userRank?.resolvedIssues || 0,
      icon: CheckCircle,
      color: 'green',
      change: '+5 this month'
    },
    {
      title: 'Community Points',
      value: userRank?.totalPoints || 0,
      icon: Trophy,
      color: 'yellow',
      change: '+15 this week'
    },
    {
      title: 'Current Rank',
      value: `#${userRank?.rank || 'N/A'}`,
      icon: TrendingUp,
      color: 'purple',
      change: '↑2 positions'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <SkeletonLoader lines={2} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <SkeletonLoader lines={3} />
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <SkeletonLoader lines={5} />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <SkeletonLoader lines={4} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Here's what's happening in your community
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <div className="flex items-center text-sm text-gray-500">
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected ? 'Connected' : 'Offline'}
              </div>
              
              
               <a href="/report"
                className="btn btn-primary flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Report Issue
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Issues */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Your Recent Issues</h2>
                  <a href="/issues" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View all
                  </a>
                </div>
              </div>
              
              <div className="p-6">
                {recentIssues?.length > 0 ? (
                  <div className="space-y-4">
                    {recentIssues.map(issue => (
                      <IssueCard key={issue.id} issue={issue} compact />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No issues yet</h3>
                    <p className="text-gray-600 mb-4">Start by reporting your first civic issue</p>
                    <a href="/report" className="btn btn-primary">
                      Report Issue
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Community Impact */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Community Impact</h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Target className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalIssues || 0}</p>
                    <p className="text-sm text-gray-600">Total Issues Reported</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.resolvedIssues || 0}</p>
                    <p className="text-sm text-gray-600">Issues Resolved</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalIssues ? Math.round((stats.resolvedIssues / stats.totalIssues) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-600">Resolution Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
              </div>
              
              <div className="p-6 space-y-3">
                
                <a href="/report"
                  className="w-full btn btn-primary flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Report New Issue
                </a>
                
                
                <a href="/issues"
                  className="w-full btn btn-outline flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Browse Issues
                </a>
                
                
                <a href="/leaderboard"
                  className="w-full btn btn-outline flex items-center justify-center"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  View Leaderboard
                </a>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
              </div>
              
              <div className="p-6">
                {activities?.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map(activity => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full bg-${activity.color}-100`}>
                          <activity.icon className={`w-4 h-4 text-${activity.color}-600`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No recent activity</p>
                )}
              </div>
            </div>

            {/* User Stats */}
            {userRank && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Your Stats</h2>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Rank</span>
                    <span className="font-semibold">#{userRank.rank}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Points</span>
                    <span className="font-semibold">{userRank.totalPoints}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-semibold">+{userRank.monthlyPoints || 0}</span>
                  </div>
                  
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress to next rank</span>
                      <span>75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: '75%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard