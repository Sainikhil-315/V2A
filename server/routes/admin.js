// routes/admin.js
const express = require('express');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Authority = require('../models/Authority');
const Contribution = require('../models/Contribution');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { 
  validateIssueStatusUpdate, 
  validateBulkOperation,
  validateAuthorityCreation 
} = require('../utils/validators');

const router = express.Router();

// Apply admin protection to all routes
router.use(protect);
router.use(adminOnly);

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Admin
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Issue statistics
    const issueStats = await Issue.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          verified: [{ $match: { status: 'verified' } }, { $count: 'count' }],
          assigned: [{ $match: { status: 'assigned' } }, { $count: 'count' }],
          inProgress: [{ $match: { status: 'in_progress' } }, { $count: 'count' }],
          resolved: [{ $match: { status: 'resolved' } }, { $count: 'count' }],
          rejected: [{ $match: { status: 'rejected' } }, { $count: 'count' }],
          today: [{ $match: { createdAt: { $gte: startOfDay } } }, { $count: 'count' }],
          thisWeek: [{ $match: { createdAt: { $gte: startOfWeek } } }, { $count: 'count' }],
          thisMonth: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: 'count' }]
        }
      }
    ]);

    // User statistics
    const userStats = await User.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          citizens: [{ $match: { role: 'citizen' } }, { $count: 'count' }],
          admins: [{ $match: { role: 'admin' } }, { $count: 'count' }],
          newToday: [{ $match: { createdAt: { $gte: startOfDay } } }, { $count: 'count' }],
          newThisWeek: [{ $match: { createdAt: { $gte: startOfWeek } } }, { $count: 'count' }],
          newThisMonth: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: 'count' }]
        }
      }
    ]);

    // Authority statistics
    const authorityStats = await Authority.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: 'active' } }, { $count: 'count' }],
          inactive: [{ $match: { status: 'inactive' } }, { $count: 'count' }]
        }
      }
    ]);

    // Category breakdown
    const categoryStats = await Issue.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Recent activity
    const recentIssues = await Issue.find()
      .populate('reporter', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Priority breakdown
    const priorityStats = await Issue.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Response time analytics (average time to resolve)
    const responseTimeStats = await Issue.aggregate([
      {
        $match: {
          status: 'resolved',
          actualResolutionTime: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          averageResolutionTime: { $avg: '$actualResolutionTime' },
          medianResolutionTime: { $median: { input: '$actualResolutionTime' } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        issues: {
          total: issueStats[0].total[0]?.count || 0,
          pending: issueStats[0].pending[0]?.count || 0,
          verified: issueStats[0].verified[0]?.count || 0,
          assigned: issueStats[0].assigned[0]?.count || 0,
          inProgress: issueStats[0].inProgress[0]?.count || 0,
          resolved: issueStats[0].resolved[0]?.count || 0,
          rejected: issueStats[0].rejected[0]?.count || 0,
          today: issueStats[0].today[0]?.count || 0,
          thisWeek: issueStats[0].thisWeek[0]?.count || 0,
          thisMonth: issueStats[0].thisMonth[0]?.count || 0
        },
        users: {
          total: userStats[0].total[0]?.count || 0,
          citizens: userStats[0].citizens[0]?.count || 0,
          admins: userStats[0].admins[0]?.count || 0,
          newToday: userStats[0].newToday[0]?.count || 0,
          newThisWeek: userStats[0].newThisWeek[0]?.count || 0,
          newThisMonth: userStats[0].newThisMonth[0]?.count || 0
        },
        authorities: {
          total: authorityStats[0].total[0]?.count || 0,
          active: authorityStats[0].active[0]?.count || 0,
          inactive: authorityStats[0].inactive[0]?.count || 0
        },
        categoryBreakdown: categoryStats,
        priorityBreakdown: priorityStats,
        recentActivity: recentIssues,
        responseTime: {
          average: responseTimeStats[0]?.averageResolutionTime || 0,
          median: responseTimeStats[0]?.medianResolutionTime || 0
        }
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// @desc    Get all pending issues for verification
// @route   GET /api/admin/issues/pending
// @access  Admin
router.get('/issues/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, priority } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { status: 'pending' };
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const issues = await Issue.find(filter)
      .populate('reporter', 'name email phone avatar stats')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Issue.countDocuments(filter);

    // Add enriched data
    const enrichedIssues = issues.map(issue => ({
      ...issue,
      upvoteCount: issue.upvotes?.length || 0,
      commentCount: issue.comments?.length || 0
    }));

    res.json({
      success: true,
      data: {
        issues: enrichedIssues,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get pending issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending issues',
      error: error.message
    });
  }
});

// @desc    Update issue status (verify/reject/assign)
// @route   PUT /api/admin/issues/:id/status
// @access  Admin
router.put('/issues/:id/status', async (req, res) => {
  try {
    // Validate status update
    const { error, value } = validateIssueStatusUpdate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const issue = await Issue.findById(req.params.id).populate('reporter');
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    const oldStatus = issue.status;
    const { status, adminNotes, rejectionReason, assignedTo, estimatedResolutionTime } = value;

    // Update issue
    issue.status = status;
    issue.adminNotes = adminNotes;
    
    if (status === 'rejected') {
      issue.rejectionReason = rejectionReason;
    }
    
    if (status === 'assigned' && assignedTo) {
      issue.assignedTo = assignedTo;
    }
    
    if (estimatedResolutionTime) {
      issue.estimatedResolutionTime = estimatedResolutionTime;
    }

    // Add timeline entry
    issue.timeline.push({
      action: status,
      timestamp: new Date(),
      user: req.user._id,
      notes: adminNotes || rejectionReason || ''
    });

    await issue.save();

    // Update user stats if issue is resolved
    if (status === 'resolved' && oldStatus !== 'resolved') {
      await User.findByIdAndUpdate(issue.reporter._id, {
        $inc: { 'stats.issuesResolved': 1 }
      });

      // Create contribution record for resolution
      await Contribution.create({
        user: issue.reporter._id,
        type: 'issue_resolved',
        issue: issue._id,
        points: 5, // 5 points for issue resolution
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        category: issue.category,
        metadata: {
          resolutionTime: issue.actualResolutionTime,
          priority: issue.priority
        }
      });
    }

    // Send notifications
    const notificationService = req.app.get('notificationService');
    if (notificationService) {
      await notificationService.notifyIssueStatusChange(
        issue, 
        oldStatus, 
        status, 
        req.user, 
        adminNotes || rejectionReason
      );
    }

    // If assigning to authority, notify them
    if (status === 'assigned' && assignedTo) {
      const authority = await Authority.findById(assignedTo);
      if (authority && notificationService) {
        await notificationService.notifyNewIssue(issue, [authority]);
      }
    }

    res.json({
      success: true,
      message: `Issue ${status} successfully`,
      data: { 
        issue: {
          id: issue._id,
          status: issue.status,
          adminNotes: issue.adminNotes,
          rejectionReason: issue.rejectionReason,
          assignedTo: issue.assignedTo,
          timeline: issue.timeline
        }
      }
    });

  } catch (error) {
    console.error('Update issue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue status',
      error: error.message
    });
  }
});

// @desc    Bulk operations on issues
// @route   POST /api/admin/issues/bulk
// @access  Admin
router.post('/issues/bulk', async (req, res) => {
  try {
    // Validate bulk operation
    const { error, value } = validateBulkOperation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { issueIds, action, assignedTo, reason } = value;

    const results = {
      successful: [],
      failed: []
    };

    for (const issueId of issueIds) {
      try {
        const issue = await Issue.findById(issueId);
        
        if (!issue) {
          results.failed.push({
            issueId,
            reason: 'Issue not found'
          });
          continue;
        }

        const oldStatus = issue.status;

        switch (action) {
          case 'verify':
            issue.status = 'verified';
            break;
          case 'reject':
            issue.status = 'rejected';
            issue.rejectionReason = reason;
            break;
          case 'assign':
            issue.status = 'assigned';
            issue.assignedTo = assignedTo;
            break;
          case 'delete':
            await Issue.findByIdAndDelete(issueId);
            results.successful.push({ issueId, action });
            continue;
        }

        if (action !== 'delete') {
          // Add timeline entry
          issue.timeline.push({
            action: issue.status,
            timestamp: new Date(),
            user: req.user._id,
            notes: reason || `Bulk ${action} operation`
          });

          await issue.save();
        }

        results.successful.push({ 
          issueId, 
          action, 
          oldStatus, 
          newStatus: issue.status 
        });

        // Send notifications (in background)
        const notificationService = req.app.get('notificationService');
        if (notificationService) {
          setImmediate(async () => {
            try {
              await notificationService.notifyIssueStatusChange(
                issue, 
                oldStatus, 
                issue.status, 
                req.user, 
                reason
              );
            } catch (notifError) {
              console.error('Bulk notification error:', notifError);
            }
          });
        }

      } catch (error) {
        results.failed.push({
          issueId,
          reason: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} operation completed`,
      data: {
        results: {
          total: issueIds.length,
          successful: results.successful.length,
          failed: results.failed.length,
          details: results
        }
      }
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk operation failed',
      error: error.message
    });
  }
});

// @desc    Get detailed analytics
// @route   GET /api/admin/analytics
// @access  Admin
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30', groupBy = 'day' } = req.query;
    const days = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Time-based grouping
    let groupStage;
    if (groupBy === 'hour') {
      groupStage = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' }
      };
    } else if (groupBy === 'week') {
      groupStage = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
    } else {
      groupStage = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
    }

    // Issue trends over time
    const issueTrends = await Issue.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupStage,
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          avgResolutionTime: { $avg: '$actualResolutionTime' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
      }
    ]);

    // Category performance
    const categoryPerformance = await Issue.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          avgResolutionTime: { 
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'resolved'] }, { $ne: ['$actualResolutionTime', null] }] },
                '$actualResolutionTime',
                null
              ]
            }
          },
          urgentCount: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          resolved: 1,
          resolutionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
            ]
          },
          avgResolutionTime: 1,
          urgentCount: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // User engagement metrics
    const userMetrics = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { 
            $sum: {
              $cond: [{ $gt: ['$stats.totalIssuesReported', 0] }, 1, 0]
            }
          },
          avgIssuesPerUser: { $avg: '$stats.totalIssuesReported' },
          topContributors: { $push: { name: '$name', score: '$stats.contributionScore' } }
        }
      }
    ]);

    // Geographic distribution
    const geographicData = await Issue.aggregate([
      {
        $group: {
          _id: {
            ward: '$location.ward',
            district: '$location.district'
          },
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      },
      {
        $match: {
          '_id.ward': { $ne: null },
          '_id.district': { $ne: null }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({
      success: true,
      data: {
        timeframe: `${days} days`,
        groupBy,
        trends: issueTrends,
        categoryPerformance,
        userMetrics: userMetrics[0] || {},
        geographicDistribution: geographicData
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

module.exports = router;