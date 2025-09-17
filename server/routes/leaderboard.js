// routes/leaderboard.js
const express = require('express');
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Issue = require('../models/Issue');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get monthly leaderboard
// @route   GET /api/leaderboard/monthly
// @access  Public
router.get('/monthly', optionalAuth, async (req, res) => {
  try {
    const { month, year, limit = 20 } = req.query;
    
    // Default to current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Get monthly leaderboard
    const leaderboard = await Contribution.getMonthlyLeaderboard(
      targetMonth, 
      targetYear, 
      parseInt(limit)
    );

    // Get user's position if authenticated
    let userPosition = null;
    if (req.user) {
      const userContributions = await Contribution.aggregate([
        {
          $match: { 
            month: targetMonth, 
            year: targetYear,
            user: req.user._id
          }
        },
        {
          $group: {
            _id: '$user',
            totalPoints: { $sum: '$points' }
          }
        }
      ]);

      if (userContributions.length > 0) {
        const userPoints = userContributions[0].totalPoints;
        
        // Calculate user's rank
        const rank = await Contribution.aggregate([
          {
            $match: { month: targetMonth, year: targetYear }
          },
          {
            $group: {
              _id: '$user',
              totalPoints: { $sum: '$points' }
            }
          },
          {
            $match: { totalPoints: { $gt: userPoints } }
          },
          {
            $count: 'rank'
          }
        ]);

        userPosition = {
          rank: (rank[0]?.rank || 0) + 1,
          points: userPoints,
          user: {
            name: req.user.name,
            avatar: req.user.avatar
          }
        };
      }
    }

    // Get total participants
    const totalParticipants = await Contribution.distinct('user', {
      month: targetMonth,
      year: targetYear
    });

    res.json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        leaderboard,
        userPosition,
        totalParticipants: totalParticipants.length,
        period: `${getMonthName(targetMonth)} ${targetYear}`
      }
    });

  } catch (error) {
    console.error('Monthly leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly leaderboard',
      message: 'Failed to fetch leaderboard statistics',
      error: error.message
    });
  }
});

// @desc    Get achievements and badges
// @route   GET /api/leaderboard/achievements
// @access  Private
router.get('/achievements', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's contribution data
    const userContributions = await Contribution.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    const userStats = await User.findById(userId).select('stats createdAt').lean();

    // Calculate achievements
    const achievements = calculateUserAchievements(userContributions, userStats);

    // Get progress towards next milestones
    const nextMilestones = getNextMilestones(userStats.stats);

    res.json({
      success: true,
      data: {
        achievements,
        nextMilestones,
        totalAchievements: achievements.length,
        recentAchievements: achievements
          .filter(a => a.unlockedAt && new Date(a.unlockedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch achievements',
      error: error.message
    });
  }
});

// @desc    Get community impact metrics
// @route   GET /api/leaderboard/impact
// @access  Public
router.get('/impact', async (req, res) => {
  try {
    const { timeframe = 30 } = req.query;
    const days = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Community impact metrics
    const impactMetrics = await Issue.aggregate([
      {
        $facet: {
          totalIssues: [
            { $match: { createdAt: { $gte: startDate } } },
            { $count: 'count' }
          ],
          resolvedIssues: [
            { $match: { 
              status: 'resolved', 
              updatedAt: { $gte: startDate } 
            }},
            { $count: 'count' }
          ],
          averageResolutionTime: [
            {
              $match: { 
                status: 'resolved',
                actualResolutionTime: { $exists: true },
                updatedAt: { $gte: startDate }
              }
            },
            {
              $group: {
                _id: null,
                avgTime: { $avg: '$actualResolutionTime' }
              }
            }
          ],
          categoryImpact: [
            {
              $match: { 
                status: 'resolved',
                updatedAt: { $gte: startDate }
              }
            },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    // Active contributors
    const activeContributors = await Contribution.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: '$user',
          contributions: { $sum: 1 },
          points: { $sum: '$points' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          name: '$user.name',
          avatar: '$user.avatar',
          contributions: 1,
          points: 1
        }
      },
      {
        $sort: { points: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Geographic impact
    const geographicImpact = await Issue.aggregate([
      {
        $match: { 
          status: 'resolved',
          updatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$location.district',
          resolvedIssues: { $sum: 1 },
          avgResolutionTime: { $avg: '$actualResolutionTime' }
        }
      },
      {
        $match: { '_id': { $ne: null } }
      },
      {
        $sort: { resolvedIssues: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const metrics = impactMetrics[0];

    res.json({
      success: true,
      data: {
        timeframe: `${days} days`,
        overview: {
          totalIssues: metrics.totalIssues[0]?.count || 0,
          resolvedIssues: metrics.resolvedIssues[0]?.count || 0,
          averageResolutionTime: metrics.averageResolutionTime[0]?.avgTime || 0,
          resolutionRate: metrics.totalIssues[0]?.count > 0 
            ? ((metrics.resolvedIssues[0]?.count || 0) / metrics.totalIssues[0].count * 100).toFixed(2)
            : 0
        },
        categoryImpact: metrics.categoryImpact,
        activeContributors,
        geographicImpact
      }
    });

  } catch (error) {
    console.error('Community impact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch community impact metrics',
      error: error.message
    });
  }
});

// Helper function to get month name
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}

// Helper function to calculate user achievements
function calculateUserAchievements(contributions, userStats) {
  const achievements = [];
  const stats = userStats.stats;
  const accountAge = Math.floor((Date.now() - new Date(userStats.createdAt)) / (1000 * 60 * 60 * 24));

  // Issue reporting achievements
  if (stats.totalIssuesReported >= 1) {
    achievements.push({
      id: 'first_report',
      title: 'First Reporter',
      description: 'Submitted your first issue',
      icon: '📝',
      category: 'reporting',
      unlockedAt: contributions.find(c => c.type === 'issue_reported')?.createdAt
    });
  }

  if (stats.totalIssuesReported >= 10) {
    achievements.push({
      id: 'active_reporter',
      title: 'Active Reporter',
      description: 'Submitted 10 issues',
      icon: '📋',
      category: 'reporting',
      unlockedAt: null // Would need to calculate from contributions
    });
  }

  if (stats.totalIssuesReported >= 50) {
    achievements.push({
      id: 'super_reporter',
      title: 'Super Reporter',
      description: 'Submitted 50 issues',
      icon: '🦸',
      category: 'reporting',
      unlockedAt: null
    });
  }

  // Resolution achievements
  if (stats.issuesResolved >= 1) {
    achievements.push({
      id: 'first_resolution',
      title: 'Problem Solver',
      description: 'Had your first issue resolved',
      icon: '✅',
      category: 'resolution',
      unlockedAt: contributions.find(c => c.type === 'issue_resolved')?.createdAt
    });
  }

  if (stats.issuesResolved >= 10) {
    achievements.push({
      id: 'solution_master',
      title: 'Solution Master',
      description: 'Had 10 issues resolved',
      icon: '🏆',
      category: 'resolution',
      unlockedAt: null
    });
  }

  // Engagement achievements
  const upvoteCount = contributions.filter(c => c.type === 'upvote_given').length;
  if (upvoteCount >= 10) {
    achievements.push({
      id: 'supporter',
      title: 'Community Supporter',
      description: 'Upvoted 10 issues',
      icon: '👍',
      category: 'engagement',
      unlockedAt: null
    });
  }

  const commentCount = contributions.filter(c => c.type === 'comment_added').length;
  if (commentCount >= 5) {
    achievements.push({
      id: 'communicator',
      title: 'Communicator',
      description: 'Added 5 comments',
      icon: '💬',
      category: 'engagement',
      unlockedAt: null
    });
  }

  // Longevity achievements
  if (accountAge >= 30) {
    achievements.push({
      id: 'month_member',
      title: 'Monthly Member',
      description: 'Active for 30 days',
      icon: '📅',
      category: 'longevity',
      unlockedAt: new Date(new Date(userStats.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000)
    });
  }

  if (accountAge >= 365) {
    achievements.push({
      id: 'veteran',
      title: 'Community Veteran',
      description: 'Active for 1 year',
      icon: '🎖️',
      category: 'longevity',
      unlockedAt: new Date(new Date(userStats.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000)
    });
  }

  return achievements;
}

// Helper function to get next milestones
function getNextMilestones(stats) {
  const milestones = [];

  // Issues reported milestones
  const reportMilestones = [1, 5, 10, 25, 50, 100];
  const nextReportMilestone = reportMilestones.find(m => m > stats.totalIssuesReported);
  if (nextReportMilestone) {
    milestones.push({
      type: 'issues_reported',
      current: stats.totalIssuesReported,
      target: nextReportMilestone,
      progress: (stats.totalIssuesReported / nextReportMilestone * 100).toFixed(1)
    });
  }

  // Issues resolved milestones
  const resolutionMilestones = [1, 5, 10, 25, 50];
  const nextResolutionMilestone = resolutionMilestones.find(m => m > stats.issuesResolved);
  if (nextResolutionMilestone) {
    milestones.push({
      type: 'issues_resolved',
      current: stats.issuesResolved,
      target: nextResolutionMilestone,
      progress: (stats.issuesResolved / nextResolutionMilestone * 100).toFixed(1)
    });
  }

  // Points milestones
  const pointMilestones = [10, 50, 100, 250, 500, 1000];
  const nextPointMilestone = pointMilestones.find(m => m > stats.contributionScore);
  if (nextPointMilestone) {
    milestones.push({
      type: 'contribution_points',
      current: stats.contributionScore,
      target: nextPointMilestone,
      progress: (stats.contributionScore / nextPointMilestone * 100).toFixed(1)
    });
  }

  return milestones;
}

// @desc    Get yearly leaderboard
// @route   GET /api/leaderboard/yearly
// @access  Public
router.get('/yearly', optionalAuth, async (req, res) => {
  try {
    const { year, limit = 20 } = req.query;
    
    // Default to current year if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get yearly leaderboard
    const leaderboard = await Contribution.getYearlyLeaderboard(
      targetYear, 
      parseInt(limit)
    );

    // Get user's position if authenticated
    let userPosition = null;
    if (req.user) {
      const userContributions = await Contribution.aggregate([
        {
          $match: { 
            year: targetYear,
            user: req.user._id
          }
        },
        {
          $group: {
            _id: '$user',
            totalPoints: { $sum: '$points' }
          }
        }
      ]);

      if (userContributions.length > 0) {
        const userPoints = userContributions[0].totalPoints;
        
        // Calculate user's rank
        const rank = await Contribution.aggregate([
          {
            $match: { year: targetYear }
          },
          {
            $group: {
              _id: '$user',
              totalPoints: { $sum: '$points' }
            }
          },
          {
            $match: { totalPoints: { $gt: userPoints } }
          },
          {
            $count: 'rank'
          }
        ]);

        userPosition = {
          rank: (rank[0]?.rank || 0) + 1,
          points: userPoints,
          user: {
            name: req.user.name,
            avatar: req.user.avatar
          }
        };
      }
    }

    // Get total participants
    const totalParticipants = await Contribution.distinct('user', {
      year: targetYear
    });

    res.json({
      success: true,
      data: {
        year: targetYear,
        leaderboard,
        userPosition,
        totalParticipants: totalParticipants.length
      }
    });

  } catch (error) {
    console.error('Yearly leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch yearly leaderboard',
      error: error.message
    });
  }
});

// @desc    Get category-wise leaderboard
// @route   GET /api/leaderboard/category
// @access  Public
router.get('/category', async (req, res) => {
  try {
    const { category, month, year, limit = 10 } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Default to current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const leaderboard = await Contribution.aggregate([
      {
        $match: { 
          category: category,
          month: targetMonth, 
          year: targetYear 
        }
      },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$points' },
          totalContributions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 1,
          name: '$userDetails.name',
          avatar: '$userDetails.avatar',
          totalPoints: 1,
          totalContributions: 1
        }
      },
      {
        $sort: { totalPoints: -1, totalContributions: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Get category statistics
    const categoryStats = await Contribution.aggregate([
      {
        $match: { 
          category: category,
          month: targetMonth, 
          year: targetYear 
        }
      },
      {
        $group: {
          _id: null,
          totalContributions: { $sum: 1 },
          totalPoints: { $sum: '$points' },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ]);

    const stats = categoryStats[0] || {
      totalContributions: 0,
      totalPoints: 0,
      uniqueUsers: []
    };

    res.json({
      success: true,
      data: {
        category,
        month: targetMonth,
        year: targetYear,
        period: `${getMonthName(targetMonth)} ${targetYear}`,
        leaderboard,
        stats: {
          totalContributions: stats.totalContributions,
          totalPoints: stats.totalPoints,
          uniqueParticipants: stats.uniqueUsers.length
        }
      }
    });

  } catch (error) {
    console.error('Category leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category leaderboard',
      error: error.message
    });
  }
});

// @desc    Get user's contribution history
// @route   GET /api/leaderboard/user/:userId
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { year, limit = 12 } = req.query;
    const userId = req.params.userId;

    // Default to current year if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get user details
    const user = await User.findById(userId).select('name avatar stats');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get monthly breakdown for the year
    const monthlyData = await Contribution.aggregate([
      {
        $match: { 
          user: user._id,
          year: targetYear 
        }
      },
      {
        $group: {
          _id: '$month',
          totalPoints: { $sum: '$points' },
          totalContributions: { $sum: 1 },
          categories: { $addToSet: '$category' },
          types: { $push: '$type' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get category breakdown
    const categoryBreakdown = await Contribution.aggregate([
      {
        $match: { 
          user: user._id,
          year: targetYear 
        }
      },
      {
        $group: {
          _id: '$category',
          totalPoints: { $sum: '$points' },
          totalContributions: { $sum: 1 }
        }
      },
      {
        $sort: { totalPoints: -1 }
      }
    ]);

    // Get recent achievements (issues resolved)
    const recentIssues = await Issue.find({
      reporter: user._id,
      status: 'resolved',
      updatedAt: { 
        $gte: new Date(targetYear, 0, 1),
        $lt: new Date(targetYear + 1, 0, 1)
      }
    })
    .select('title category status updatedAt actualResolutionTime')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

    // Calculate user's current rank
    const currentMonth = new Date().getMonth() + 1;
    const userRank = await Contribution.aggregate([
      {
        $match: { 
          month: currentMonth, 
          year: targetYear 
        }
      },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$points' }
        }
      },
      {
        $sort: { totalPoints: -1 }
      }
    ]);

    const userPosition = userRank.findIndex(u => u._id.toString() === userId) + 1;

    // Total stats for the year
    const yearTotal = await Contribution.aggregate([
      {
        $match: { 
          user: user._id,
          year: targetYear 
        }
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$points' },
          totalContributions: { $sum: 1 }
        }
      }
    ]);

    const totalStats = yearTotal[0] || { totalPoints: 0, totalContributions: 0 };

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          avatar: user.avatar,
          overallStats: user.stats
        },
        year: targetYear,
        currentRank: userPosition || null,
        yearlyTotal: totalStats,
        monthlyBreakdown: monthlyData,
        categoryBreakdown,
        recentAchievements: recentIssues
      }
    });

  } catch (error) {
    console.error('User contribution history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user contribution history',
      error: error.message
    });
  }
});

// @desc    Get leaderboard statistics
// @route   GET /api/leaderboard/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Overall statistics
    const overallStats = await Contribution.aggregate([
      {
        $group: {
          _id: null,
          totalContributions: { $sum: 1 },
          totalPoints: { $sum: '$points' },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ]);

    // Monthly growth
    const monthlyGrowth = await Contribution.aggregate([
      {
        $match: {
          year: currentYear
        }
      },
      {
        $group: {
          _id: '$month',
          contributions: { $sum: 1 },
          points: { $sum: '$points' },
          users: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          month: '$_id',
          contributions: 1,
          points: 1,
          uniqueUsers: { $size: '$users' }
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    // Top categories this month
    const topCategories = await Contribution.getCategoryStats(currentMonth, currentYear);

    // Activity heatmap (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const activityHeatmap = await Contribution.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Achievement milestones
    const milestones = await User.aggregate([
      {
        $project: {
          name: 1,
          avatar: 1,
          totalPoints: '$stats.contributionScore',
          totalIssues: '$stats.totalIssuesReported',
          resolvedIssues: '$stats.issuesResolved'
        }
      },
      {
        $facet: {
          topReporters: [
            { $sort: { totalIssues: -1 } },
            { $limit: 5 }
          ],
          topResolvers: [
            { $sort: { resolvedIssues: -1 } },
            { $limit: 5 }
          ],
          topContributors: [
            { $sort: { totalPoints: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    const overall = overallStats[0] || {
      totalContributions: 0,
      totalPoints: 0,
      uniqueUsers: []
    };

    res.json({
      success: true,
      data: {
        overview: {
          totalContributions: overall.totalContributions,
          totalPoints: overall.totalPoints,
          totalUsers: overall.uniqueUsers.length,
          averagePointsPerUser: overall.uniqueUsers.length > 0 
            ? Math.round(overall.totalPoints / overall.uniqueUsers.length) 
            : 0
        },
        monthlyGrowth,
        topCategories,
        activityHeatmap,
        achievements: milestones[0] || {
          topReporters: [],
          topResolvers: [],
          topContributors: []
        }
      }
    });

  } catch (error) {
    console.error('Leaderboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard statistics',
      error: error.message
    });
  }
});

module.exports = router;