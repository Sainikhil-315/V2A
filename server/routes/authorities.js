// routes/authorities.js
const express = require('express');
const Authority = require('../models/Authority');
const Issue = require('../models/Issue');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { validateAuthorityCreation } = require('../utils/validators');

const router = express.Router();

// @desc    Get all authorities
// @route   GET /api/authorities
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { department, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;

    const authorities = await Authority.find(filter)
      .select('-contact.alternatePhone -emergencyContact -budget')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Authority.countDocuments(filter);

    res.json({
      success: true,
      data: {
        authorities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get authorities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authorities',
      error: error.message
    });
  }
});

// @desc    Get single authority by ID
// @route   GET /api/authorities/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id).lean();

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    // Get assigned issues count
    const issueStats = await Issue.aggregate([
      {
        $match: { assignedTo: authority._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      total: 0,
      assigned: 0,
      inProgress: 0,
      resolved: 0
    };

    issueStats.forEach(stat => {
      stats.total += stat.count;
      if (stat._id === 'assigned') stats.assigned = stat.count;
      else if (stat._id === 'in_progress') stats.inProgress = stat.count;
      else if (stat._id === 'resolved') stats.resolved = stat.count;
    });

    res.json({
      success: true,
      data: {
        authority: {
          ...authority,
          issueStats: stats
        }
      }
    });

  } catch (error) {
    console.error('Get authority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authority',
      error: error.message
    });
  }
});

// @desc    Create new authority (Admin only)
// @route   POST /api/authorities
// @access  Admin
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    // Validate authority data
    const { error, value } = validateAuthorityCreation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if authority with same email exists
    const existingAuthority = await Authority.findOne({
      'contact.email': value.contact.email
    });

    if (existingAuthority) {
      return res.status(400).json({
        success: false,
        message: 'Authority with this email already exists'
      });
    }

    const authority = await Authority.create(value);

    res.status(201).json({
      success: true,
      message: 'Authority created successfully',
      data: { authority }
    });

  } catch (error) {
    console.error('Create authority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create authority',
      error: error.message
    });
  }
});

// @desc    Update authority (Admin only)
// @route   PUT /api/authorities/:id
// @access  Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    const allowedUpdates = [
      'name', 'department', 'contact', 'serviceArea', 
      'workingHours', 'emergencyContact', 'status',
      'headOfDepartment', 'notificationPreferences'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Update last modified timestamp
    updates.lastUpdated = new Date();

    const updatedAuthority = await Authority.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Authority updated successfully',
      data: { authority: updatedAuthority }
    });

  } catch (error) {
    console.error('Update authority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update authority',
      error: error.message
    });
  }
});

// @desc    Delete authority (Admin only)
// @route   DELETE /api/authorities/:id
// @access  Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    // Check if authority has assigned issues
    const assignedIssuesCount = await Issue.countDocuments({
      assignedTo: req.params.id,
      status: { $in: ['assigned', 'in_progress'] }
    });

    if (assignedIssuesCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete authority with assigned active issues. Reassign issues first.'
      });
    }

    // Unassign resolved/closed issues
    await Issue.updateMany(
      { assignedTo: req.params.id },
      { $unset: { assignedTo: 1 } }
    );

    await Authority.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Authority deleted successfully'
    });

  } catch (error) {
    console.error('Delete authority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete authority',
      error: error.message
    });
  }
});

// @desc    Get issues assigned to authority
// @route   GET /api/authorities/:id/issues
// @access  Private (Authority/Admin)
router.get('/:id/issues', protect, async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    const { status, priority, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { assignedTo: req.params.id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const issues = await Issue.find(filter)
      .populate('reporter', 'name email phone avatar')
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
        authority: {
          name: authority.name,
          department: authority.department
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get authority issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authority issues',
      error: error.message
    });
  }
});

// @desc    Update issue status by authority
// @route   PUT /api/authorities/:id/issues/:issueId
// @access  Private (Authority/Admin)
router.put('/:id/issues/:issueId', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Authorities can only mark issues as in_progress or resolved'
      });
    }

    const authority = await Authority.findById(req.params.id);
    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    const issue = await Issue.findOne({
      _id: req.params.issueId,
      assignedTo: req.params.id
    }).populate('reporter');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found or not assigned to this authority'
      });
    }

    const oldStatus = issue.status;
    issue.status = status;
    
    if (notes) {
      issue.adminNotes = notes;
    }

    // Add timeline entry
    issue.timeline.push({
      action: status,
      timestamp: new Date(),
      authority: authority._id,
      notes: notes || ''
    });

    await issue.save();

    // Update authority performance metrics
    if (status === 'resolved') {
      await Authority.findByIdAndUpdate(req.params.id, {
        $inc: { 'performanceMetrics.resolvedIssues': 1 },
        lastUpdated: new Date()
      });
    }

    // Send notifications
    const notificationService = req.app.get('notificationService');
    if (notificationService) {
      await notificationService.notifyIssueStatusChange(
        issue, 
        oldStatus, 
        status, 
        { name: authority.name }, 
        notes
      );
    }

    res.json({
      success: true,
      message: `Issue marked as ${status}`,
      data: {
        issue: {
          id: issue._id,
          status: issue.status,
          timeline: issue.timeline
        }
      }
    });

  } catch (error) {
    console.error('Update issue status by authority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue status',
      error: error.message
    });
  }
});

// @desc    Get authority performance metrics
// @route   GET /api/authorities/:id/metrics
// @access  Private (Admin)
router.get('/:id/metrics', protect, adminOnly, async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    const { timeframe = 30 } = req.query;
    const days = parseInt(timeframe);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get detailed metrics
    const metrics = await Issue.aggregate([
      {
        $match: {
          assignedTo: authority._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'resolved'] }, { $ne: ['$actualResolutionTime', null] }] },
                '$actualResolutionTime',
                null
              ]
            }
          }
        }
      }
    ]);

    // Get category-wise breakdown
    const categoryBreakdown = await Issue.aggregate([
      {
        $match: {
          assignedTo: authority._id,
          createdAt: { $gte: startDate }
        }
      },
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
          }
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
          avgResolutionTime: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Get daily activity
    const dailyActivity = await Issue.aggregate([
      {
        $match: {
          assignedTo: authority._id,
          updatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }
          },
          issuesWorkedOn: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    const metricsData = metrics[0] || {
      totalAssigned: 0,
      resolved: 0,
      inProgress: 0,
      avgResolutionTime: 0
    };

    const resolutionRate = metricsData.totalAssigned > 0 ? 
      ((metricsData.resolved / metricsData.totalAssigned) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        authority: {
          name: authority.name,
          department: authority.department
        },
        timeframe: `${days} days`,
        overview: {
          ...metricsData,
          resolutionRate: parseFloat(resolutionRate)
        },
        categoryBreakdown,
        dailyActivity
      }
    });

  } catch (error) {
    console.error('Get authority metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authority metrics',
      error: error.message
    });
  }
});

// @desc    Get authorities by department
// @route   GET /api/authorities/department/:department
// @access  Public
router.get('/department/:department', async (req, res) => {
  try {
    const authorities = await Authority.find({
      department: req.params.department,
      status: 'active'
    })
    .select('name contact serviceArea workingHours performanceMetrics')
    .sort({ 'performanceMetrics.rating': -1 })
    .lean();

    if (authorities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No authorities found for this department'
      });
    }

    res.json({
      success: true,
      data: {
        department: req.params.department,
        authorities
      }
    });

  } catch (error) {
    console.error('Get authorities by department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authorities by department',
      error: error.message
    });
  }
});

// @desc    Find authority for location
// @route   POST /api/authorities/find-by-location
// @access  Public
router.post('/find-by-location', async (req, res) => {
  try {
    const { lat, lng, category } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Build filter
    const filter = {
      status: 'active'
    };

    if (category) {
      filter.department = category;
    }

    // Find authorities (simplified - in production, use proper geospatial queries)
    const authorities = await Authority.find(filter)
      .select('name department contact serviceArea performanceMetrics')
      .limit(5)
      .lean();

    if (authorities.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No authorities found for this location and category'
      });
    }

    // In a real implementation, you would use geospatial queries to find
    // authorities whose service area contains the given coordinates
    // For now, we'll return all matching authorities

    res.json({
      success: true,
      data: {
        location: { lat, lng },
        category: category || 'all',
        authorities: authorities.map(auth => ({
          ...auth,
          distance: Math.floor(Math.random() * 5000), // Mock distance in meters
          estimatedResponse: Math.floor(Math.random() * 48) + 2 // Mock response time in hours
        }))
      }
    });

  } catch (error) {
    console.error('Find authority by location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find authority for location',
      error: error.message
    });
  }
});

// @desc    Get authority statistics overview
// @route   GET /api/authorities/stats
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    // Overall authority statistics
    const authorityStats = await Authority.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          avgRating: { $avg: '$performanceMetrics.rating' },
          totalResolved: { $sum: '$performanceMetrics.resolvedIssues' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Performance rankings
    const topPerformers = await Authority.find({ status: 'active' })
      .select('name department performanceMetrics')
      .sort({ 
        'performanceMetrics.resolutionRate': -1,
        'performanceMetrics.rating': -1 
      })
      .limit(10)
      .lean();

    // Response time statistics
    const responseTimeStats = await Authority.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$performanceMetrics.averageResolutionTime' },
          fastestResponse: { $min: '$performanceMetrics.averageResolutionTime' },
          slowestResponse: { $max: '$performanceMetrics.averageResolutionTime' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        departmentBreakdown: authorityStats,
        topPerformers,
        responseTimeStats: responseTimeStats[0] || {
          avgResolutionTime: 0,
          fastestResponse: 0,
          slowestResponse: 0
        }
      }
    });

  } catch (error) {
    console.error('Get authority stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authority statistics',
      error: error.message
    });
  }
});

module.exports = router;