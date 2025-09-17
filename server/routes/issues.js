// routes/issues.js
const express = require('express');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Authority = require('../models/Authority');
const Contribution = require('../models/Contribution');
const { protect, optionalAuth } = require('../middleware/auth');
const { ownerOrAdmin } = require('../middleware/roleCheck');
const { handleMultipleUpload } = require('../middleware/upload');
const { uploadMultipleFiles } = require('../config/cloudinary');
const { 
  validateIssueSubmission, 
  validateComment, 
  validateSearchFilter,
  validateGeolocation 
} = require('../utils/validators');
const turf = require('@turf/turf');

const router = express.Router();

// @desc    Get all issues with filters
// @route   GET /api/issues
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = validateSearchFilter(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const {
      q,
      category,
      status,
      priority,
      ward,
      district,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      limit
    } = value;

    // Build filter object
    const filter = {};

    // Only show public issues to non-authenticated users
    if (!req.user) {
      filter.visibility = 'public';
    } else if (req.user.role !== 'admin') {
      // Regular users see public issues + their own private issues
      filter.$or = [
        { visibility: 'public' },
        { reporter: req.user._id }
      ];
    }

    // Apply filters
    if (q) {
      filter.$text = { $search: q };
    }
    if (category) {
      filter.category = category;
    }
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (ward) {
      filter['location.ward'] = new RegExp(ward, 'i');
    }
    if (district) {
      filter['location.district'] = new RegExp(district, 'i');
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const issues = await Issue.find(filter)
      .populate('reporter', 'name avatar')
      .populate('assignedTo', 'name department')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Issue.countDocuments(filter);

    // Add upvote count and user upvote status
    const enrichedIssues = issues.map(issue => ({
      ...issue,
      upvoteCount: issue.upvotes?.length || 0,
      userUpvoted: req.user ? issue.upvotes?.some(upvote => 
        upvote.user.toString() === req.user._id.toString()) : false,
      commentCount: issue.comments?.length || 0
    }));

    res.json({
      success: true,
      data: {
        issues: enrichedIssues,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: value
      }
    });

  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issues',
      error: error.message
    });
  }
});

// @desc    Get issues near a location
// @route   GET /api/issues/nearby
// @access  Public
router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    // Validate geolocation parameters
    const { error, value } = validateGeolocation(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { lat, lng, radius } = value;

    // Build base filter
    const filter = {
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius
        }
      }
    };

    // Apply visibility filter
    if (!req.user) {
      filter.visibility = 'public';
    } else if (req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'public' },
        { reporter: req.user._id }
      ];
    }

    const issues = await Issue.find(filter)
      .populate('reporter', 'name avatar')
      .populate('assignedTo', 'name department')
      .limit(50)
      .lean();

    // Calculate distance for each issue
    const issuesWithDistance = issues.map(issue => {
      const distance = turf.distance(
        [lng, lat],
        [issue.location.coordinates.lng, issue.location.coordinates.lat],
        { units: 'meters' }
      );

      return {
        ...issue,
        distance: Math.round(distance),
        upvoteCount: issue.upvotes?.length || 0,
        userUpvoted: req.user ? issue.upvotes?.some(upvote => 
          upvote.user.toString() === req.user._id.toString()) : false
      };
    });

    res.json({
      success: true,
      data: {
        issues: issuesWithDistance,
        center: { lat, lng },
        radius
      }
    });

  } catch (error) {
    console.error('Get nearby issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby issues',
      error: error.message
    });
  }
});

// @desc    Get single issue by ID
// @route   GET /api/issues/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'name email avatar phone')
      .populate('assignedTo', 'name department contact')
      .populate('comments.user', 'name avatar')
      .populate('upvotes.user', 'name')
      .lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check visibility permissions
    if (issue.visibility === 'private' && 
        (!req.user || (req.user._id.toString() !== issue.reporter._id.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to private issue'
      });
    }

    // Enrich issue data
    const enrichedIssue = {
      ...issue,
      upvoteCount: issue.upvotes?.length || 0,
      userUpvoted: req.user ? issue.upvotes?.some(upvote => 
        upvote.user._id.toString() === req.user._id.toString()) : false,
      commentCount: issue.comments?.length || 0,
      canEdit: req.user && (req.user._id.toString() === issue.reporter._id.toString() || req.user.role === 'admin'),
      canComment: !!req.user
    };

    res.json({
      success: true,
      data: { issue: enrichedIssue }
    });

  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue',
      error: error.message
    });
  }
});

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
router.post('/', protect, handleMultipleUpload, async (req, res) => {
  try {
    // Validate issue data
    const { error, value } = validateIssueSubmission(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Upload media files if any
    let mediaFiles = [];
    if (req.files && req.files.length > 0) {
      const uploadResults = await uploadMultipleFiles(req.files);
      
      // Filter successful uploads
      mediaFiles = uploadResults.filter(result => !result.error);
      
      // Log any upload errors
      const errors = uploadResults.filter(result => result.error);
      if (errors.length > 0) {
        console.warn('File upload errors:', errors);
      }
    }

    // Create issue
    const issueData = {
      ...value,
      reporter: req.user._id,
      media: mediaFiles,
      timeline: [{
        action: 'submitted',
        timestamp: new Date(),
        user: req.user._id
      }]
    };

    const issue = await Issue.create(issueData);
    
    // Populate the created issue
    await issue.populate('reporter', 'name email avatar');

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalIssuesReported': 1 }
    });

    // Create contribution record
    await Contribution.create({
      user: req.user._id,
      type: 'issue_reported',
      issue: issue._id,
      points: 2, // 2 points for reporting an issue
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      category: issue.category,
      metadata: {
        priority: issue.priority,
        location: {
          ward: issue.location.ward,
          district: issue.location.district
        }
      }
    });

    // Find and notify relevant authorities
    const authorities = await Authority.find({
      department: issue.category,
      status: 'active'
    });

    // Send notifications
    const notificationService = req.app.get('notificationService');
    if (notificationService && authorities.length > 0) {
      await notificationService.notifyNewIssue(issue, authorities);
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`issue_${issue._id}`).emit('comment_added', {
        issueId: issue._id,
        comment: newComment,
        user: {
          name: req.user.name,
          avatar: req.user.avatar
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: newComment }
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

// @desc    Upvote/Remove upvote from issue
// @route   POST /api/issues/:id/upvote
// @access  Private
router.post('/:id/upvote', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check if user already upvoted
    const existingUpvoteIndex = issue.upvotes.findIndex(
      upvote => upvote.user.toString() === req.user._id.toString()
    );

    let action;
    if (existingUpvoteIndex > -1) {
      // Remove upvote
      issue.upvotes.splice(existingUpvoteIndex, 1);
      action = 'removed';

      // Remove contribution record
      await Contribution.findOneAndDelete({
        user: req.user._id,
        issue: issue._id,
        type: 'upvote_given'
      });
    } else {
      // Add upvote
      issue.upvotes.push({
        user: req.user._id,
        timestamp: new Date()
      });
      action = 'added';

      // Create contribution record
      await Contribution.create({
        user: req.user._id,
        type: 'upvote_given',
        issue: issue._id,
        points: 1, // 1 point for upvoting
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        category: issue.category
      });
    }

    await issue.save();

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`issue_${issue._id}`).emit('upvote_updated', {
        issueId: issue._id,
        upvoteCount: issue.upvotes.length,
        action,
        user: req.user.name
      });
    }

    res.json({
      success: true,
      message: `Upvote ${action} successfully`,
      data: {
        upvoteCount: issue.upvotes.length,
        userUpvoted: action === 'added'
      }
    });

  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process upvote',
      error: error.message
    });
  }
});

// @desc    Get user's own issues
// @route   GET /api/issues/my/issues
// @access  Private
router.get('/my/issues', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { reporter: req.user._id };
    if (status) {
      filter.status = status;
    }

    const issues = await Issue.find(filter)
      .populate('assignedTo', 'name department')
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
    console.error('Get user issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your issues',
      error: error.message
    });
  }
});

// @desc    Get issue statistics
// @route   GET /api/issues/stats
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Issue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Issue.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const priorityStats = await Issue.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await Issue.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
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

    const totalIssues = await Issue.countDocuments();
    const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
    const resolutionRate = totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        overview: {
          total: totalIssues,
          resolved: resolvedIssues,
          resolutionRate: parseFloat(resolutionRate)
        },
        statusBreakdown: stats,
        topCategories: categoryStats,
        priorityBreakdown: priorityStats,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// @desc    Search issues by text
// @route   GET /api/issues/search
// @access  Public
router.get('/search/text', optionalAuth, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const skip = (page - 1) * limit;

    // Build filter for visibility
    const filter = {
      $text: { $search: q }
    };

    if (!req.user) {
      filter.visibility = 'public';
    } else if (req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'public' },
        { reporter: req.user._id }
      ];
    }

    const issues = await Issue.find(filter, { score: { $meta: 'textScore' } })
      .populate('reporter', 'name avatar')
      .populate('assignedTo', 'name department')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Issue.countDocuments(filter);

    // Add enriched data
    const enrichedIssues = issues.map(issue => ({
      ...issue,
      upvoteCount: issue.upvotes?.length || 0,
      commentCount: issue.comments?.length || 0,
      userUpvoted: req.user ? issue.upvotes?.some(upvote => 
        upvote.user.toString() === req.user._id.toString()) : false
    }));

    res.json({
      success: true,
      data: {
        issues: enrichedIssues,
        query: q,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Search issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search issues',
      error: error.message
    });
  }
});

// @desc    Update issue (reporter only for pending issues)
// @route   PUT /api/issues/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check permissions
    if (issue.reporter.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow updates for pending issues
    if (issue.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit issue after it has been processed'
      });
    }

    // Validate update data
    const allowedUpdates = ['title', 'description', 'category', 'priority', 'tags', 'visibility'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('reporter', 'name avatar');

    res.json({
      success: true,
      message: 'Issue updated successfully',
      data: { issue: updatedIssue }
    });

  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue',
      error: error.message
    });
  }
});

// @desc    Delete issue (reporter only for pending issues)
// @route   DELETE /api/issues/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check permissions
    if (issue.reporter.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow deletion for pending issues
    if (issue.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete issue after it has been processed'
      });
    }

    await Issue.findByIdAndDelete(req.params.id);

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalIssuesReported': -1 }
    });

    // Remove contribution record
    await Contribution.findOneAndDelete({
      user: req.user._id,
      issue: req.params.id,
      type: 'issue_reported'
    });

    res.json({
      success: true,
      message: 'Issue deleted successfully'
    });

  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete issue',
      error: error.message
    });
  }
});

// @desc    Add comment to issue
// @route   POST /api/issues/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    // Validate comment
    const { error, value } = validateComment(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const issue = await Issue.findById(req.params.id);
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Add comment
    const comment = {
      user: req.user._id,
      message: value.message,
      timestamp: new Date()
    };

    issue.comments.push(comment);
    await issue.save();

    // Populate the new comment
    await issue.populate('comments.user', 'name avatar');
    const newComment = issue.comments[issue.comments.length - 1];

    // Create contribution record
    await Contribution.create({
      user: req.user._id,
      type: 'comment_added',
      issue: issue._id,
      points: 1, // 1 point for adding a comment
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      category: issue.category
    });

    // Emit real-time notification
    const io  = req.app.get('io');
    if (io) {
      io.to('role_admin').emit('new_issue_submitted', {
        issueId: issue._id,
        title: issue.title,
        category: issue.category,
        priority: issue.priority,
        reporter: issue.reporter.name,
        location: issue.location
      });
    }

    res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      data: { issue }
    });

  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create issue',
      error: error.message
    });
  }
});


module.exports = router;