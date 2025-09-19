// src/components/leaderboard/ContributorBoard.jsx
import React, { useState, useEffect } from 'react'
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  Calendar,
  Filter,
  User,
  Star
} from 'lucide-react'
import { leaderboardAPI, issuesAPI, adminAPI } from '../../utils/api'
import { formatNumber, formatRelativeTime } from '../../utils/helpers'
import { SkeletonLoader } from '../common/Loader'

const ContributorBoard = () => {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeframe, setTimeframe] = useState('monthly');
  const [category, setCategory] = useState('all');
  const [stats, setStats] = useState({ totalIssues: 0, resolvedIssues: 0, activeContributors: 0 });

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe, category]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let response;
      const params = category !== 'all' ? { category } : {};
      if (timeframe === 'monthly') {
        response = await leaderboardAPI.getMonthly(params);
      } else {
        response = await leaderboardAPI.getYearly(params);
      }
      // Robust mapping for leaderboard
      const lbData = response.data?.data?.leaderboard || response.data?.leaderboard || [];

      // Fetch join date for each user as the date of their first posted issue
      const leaderboardWithJoin = await Promise.all(lbData.map(async (user, idx) => {
        const userId = user.id || user._id || user.userId || (user.userDetails && user.userDetails._id);
        let joinedAt = null;
        try {
          // Fetch issues for this user, sorted by createdAt ascending, get first
          const userIssuesResp = await issuesAPI.getAll({ reporter: userId, sortBy: 'createdAt', sortOrder: 'asc', limit: 1 });
          const firstIssue = userIssuesResp.data?.issues?.[0];
          if (firstIssue && firstIssue.createdAt) {
            joinedAt = firstIssue.createdAt;
          } else {
            // fallback to user.createdAt or user.userDetails.createdAt
            joinedAt = user.createdAt || user.userDetails?.createdAt || null;
          }
        } catch (e) {
          joinedAt = user.createdAt || user.userDetails?.createdAt || null;
        }
        return {
          id: userId || idx,
          name: user.name || user.userDetails?.name || 'Unknown',
          avatar: user.avatar || user.userDetails?.avatar || '',
          points: user.points ?? user.totalPoints ?? 0,
          issueCount: user.issueCount ?? user.totalContributions ?? user.issues ?? 0,
          resolvedCount: user.resolvedCount ?? user.issuesResolved ?? 0,
          joinedAt,
          monthlyGrowth: user.monthlyGrowth ?? user.monthlyPoints ?? (timeframe === 'monthly' ? (user.points ?? user.totalPoints ?? 0) : 0),
          title: user.title || 'Community Member',
        };
      }));
      setLeaderboard(leaderboardWithJoin);

      // Fetch issues count for Community Impact
      let totalIssues = 0;
      if (category === 'all') {
        const allIssuesResp = await issuesAPI.getAll({ limit: 1 });
        totalIssues = allIssuesResp.data?.pagination?.total || allIssuesResp.data?.total || 0;
      } else {
        const catIssuesResp = await issuesAPI.getAll({ category, limit: 1 });
        totalIssues = catIssuesResp.data?.pagination?.total || catIssuesResp.data?.total || 0;
      }
      setStats((prev) => ({ ...prev, totalIssues }));
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return (
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">{rank}</span>
          </div>
        )
    }
  }

  const getBadgeColor = (rank) => {
    if (rank <= 3) return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
    if (rank <= 10) return 'bg-gradient-to-r from-blue-400 to-blue-600'
    return 'bg-gray-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <SkeletonLoader lines={2} className="mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <SkeletonLoader lines={8} />
              </div>
            </div>
            <div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <SkeletonLoader lines={6} />
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Trophy className="w-8 h-8 mr-3 text-yellow-500" />
                Community Leaderboard
              </h1>
              <p className="text-gray-600 mt-1">
                Recognizing our top civic contributors
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="form-select text-black"
              >
                <option value="monthly">This Month</option>
                <option value="yearly">This Year</option>
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-select text-black"
              >
                <option value="all">All Categories</option>
                <option value="road_maintenance">Road Maintenance</option>
                <option value="waste_management">Waste Management</option>
                <option value="water_supply">Water Supply</option>
                <option value="electricity">Electricity</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Leaderboard */}
          <div className="lg:col-span-3">
            {/* Top 3 Podium */}
            {leaderboard?.length >= 3 && (
              <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                  🏆 Top Contributors
                </h2>
                
                <div className="flex items-end justify-center space-x-8">
                  {/* 2nd Place */}
                  <div className="text-center">
                    <div className="relative mb-4">
                      {leaderboard[1].avatar ? (
                        <img
                          src={leaderboard[1].avatar}
                          alt={leaderboard[1].name}
                          className="w-16 h-16 rounded-full object-cover mx-auto border-4 border-gray-400"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto border-4 border-gray-400">
                          <User className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute -top-2 -right-2">
                        <Medal className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    <div className="bg-gray-100 px-4 py-8 rounded-lg">
                      <h3 className="font-bold text-lg text-gray-900">{leaderboard[1].name}</h3>
                      <p className="text-gray-600 text-sm">{formatNumber(leaderboard[1].points)} points</p>
                      <p className="text-gray-500 text-xs">{leaderboard[1].issueCount} issues</p>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="text-center">
                    <div className="relative mb-4">
                      {leaderboard[0].avatar ? (
                        <img
                          src={leaderboard[0].avatar}
                          alt={leaderboard[0].name}
                          className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-yellow-400"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto border-4 border-yellow-400">
                          <User className="w-10 h-10 text-yellow-600" />
                        </div>
                      )}
                      <div className="absolute -top-3 -right-3">
                        <Trophy className="w-10 h-10 text-yellow-500" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-yellow-50 to-yellow-100 px-6 py-10 rounded-lg">
                      <h3 className="font-bold text-xl text-gray-900">{leaderboard[0].name}</h3>
                      <p className="text-yellow-700 text-lg font-semibold">{formatNumber(leaderboard[0].points)} points</p>
                      <p className="text-gray-600 text-sm">{leaderboard[0].issueCount} issues</p>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="text-center">
                    <div className="relative mb-4">
                      {leaderboard[2].avatar ? (
                        <img
                          src={leaderboard[2].avatar}
                          alt={leaderboard[2].name}
                          className="w-16 h-16 rounded-full object-cover mx-auto border-4 border-amber-600"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto border-4 border-amber-600">
                          <User className="w-8 h-8 text-amber-600" />
                        </div>
                      )}
                      <div className="absolute -top-2 -right-2">
                        <Award className="w-8 h-8 text-amber-600" />
                      </div>
                    </div>
                    <div className="bg-amber-50 px-4 py-8 rounded-lg">
                      <h3 className="font-bold text-lg text-gray-900">{leaderboard[2].name}</h3>
                      <p className="text-amber-700 font-semibold">{formatNumber(leaderboard[2].points)} points</p>
                      <p className="text-gray-500 text-xs">{leaderboard[2].issueCount} issues</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  {timeframe === 'monthly' ? 'Monthly' : 'Yearly'} Rankings
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contributor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issues
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resolved
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Join Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaderboard?.map((contributor, index) => (
                      <tr key={contributor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRankIcon(index + 1)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {contributor.avatar ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={contributor.avatar}
                                alt={contributor.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">
                                  {contributor.name}
                                </div>
                                {index < 3 && (
                                  <Star className="w-4 h-4 text-yellow-400 ml-2" />
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {contributor.title || 'Community Member'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatNumber(contributor.points)}
                          </div>
                          <div className="text-xs text-green-600">
                            +{formatNumber(contributor.monthlyGrowth || 0)} this month
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contributor.issueCount}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contributor.resolvedCount}
                          <span className="text-xs text-gray-400 ml-1">
                            ({Math.round((contributor.resolvedCount / contributor.issueCount) * 100) || 0}%)
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contributor.joinedAt ? formatRelativeTime(contributor.joinedAt) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {leaderboard?.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No contributors yet</h3>
                  <p className="text-gray-600">Be the first to report an issue and earn points!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Impact Stats */}
            {console.log("Stats:", stats)};
            {stats && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Community Impact</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-1">
                      {formatNumber(stats.totalIssues || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Issues Reported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {formatNumber(stats.resolvedIssues || stats.overview?.resolved || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Issues Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {formatNumber(stats.activeContributors || stats.overview?.uniqueUsers?.length || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Active Contributors</div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Resolution Rate</span>
                      <span className="font-semibold text-green-600">
                        {Math.round(((stats.resolvedIssues || stats.overview?.resolved || 0) / (stats.totalIssues || stats.overview?.total || 1)) * 100) || 0}%
                      </span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round(((stats.resolvedIssues || stats.overview?.resolved || 0) / (stats.totalIssues || stats.overview?.total || 1)) * 100) || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* How Points Work */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">How Points Work</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Report Issue</span>
                  <span className="font-semibold text-primary-600">+2 pts</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Issue Resolved</span>
                  <span className="font-semibold text-green-600">+5 pts</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Add Comment</span>
                  <span className="font-semibold text-blue-600">+1 pt</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Receive Upvote</span>
                  <span className="font-semibold text-purple-600">+1 pt</span>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Points help us recognize the most active community members who make a real difference.
                  </p>
                </div>
              </div>
            </div>

            {/* Achievement Levels */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Achievement Levels</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Newcomer</div>
                    <div className="text-xs text-gray-500">0-9 points</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Contributor</div>
                    <div className="text-xs text-gray-500">10-49 points</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Champion</div>
                    <div className="text-xs text-gray-500">50-99 points</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Hero</div>
                    <div className="text-xs text-gray-500">100+ points</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContributorBoard