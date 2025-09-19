// routes/authorities.js - Fixed OTP system
const express = require('express');
const Authority = require('../models/Authority');
const Issue = require('../models/Issue');
const { protect, optionalAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const { validateAuthorityCreation } = require('../utils/validators');
const { sendEmail } = require('../services/emailService'); // Import email service

const jwt = require('jsonwebtoken');
const otpStore = new Map(); // In-memory OTP store: email -> { otp, expiresAt }
const router = express.Router();

// Utility: Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Utility: Send OTP via email
async function sendOTP(email, otp, authorityName) {
  const subject = 'Voice2Action Authority Login - OTP Verification';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Authority Login Verification</h2>
      
      <p>Dear ${authorityName},</p>
      
      <p>You have requested to login to your Voice2Action Authority Portal. Please use the following OTP to complete your login:</p>
      
      <div style="background-color: #f3f4f6; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h1 style="color: #1f2937; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p style="margin: 0;"><strong>Important:</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>This OTP is valid for <strong>5 minutes</strong> only</li>
          <li>Do not share this OTP with anyone</li>
          <li>If you didn't request this login, please contact admin immediately</li>
        </ul>
      </div>
      
      <p>If you're having trouble logging in, please contact the system administrator.</p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #6b7280; font-size: 14px;">
        This is an automated message from Voice2Action Authority Portal.<br>
        For support, contact: admin@voice2action.com
      </p>
    </div>
  `;

  try {
    const result = await sendEmail(email, subject, html);
    if (!result.success) {
      throw new Error(result.error);
    }
    console.log(`OTP sent successfully to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send OTP to ${email}:`, error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
}

// @desc    Request OTP for authority login
// @route   POST /api/authorities/login/request-otp
// @access  Public
router.post('/login/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    
    const authority = await Authority.findOne({ 'contact.email': email });
    if (!authority) {
      return res.status(404).json({ success: false, message: 'Authority not found with this email address' });
    }
    
    if (authority.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Authority account is not active. Please contact administrator.' 
      });
    }

    // Check if OTP was recently sent (rate limiting)
    const existingRecord = otpStore.get(email);
    if (existingRecord && (Date.now() - (existingRecord.requestTime || 0)) < 60000) { // 1 minute cooldown
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting a new OTP. Try again in a minute.'
      });
    }
    
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const requestTime = Date.now();
    
    // Store OTP with additional metadata
    otpStore.set(email, { 
      otp, 
      expiresAt, 
      requestTime,
      attempts: 0,
      maxAttempts: 3
    });
    
    // Send OTP via email
    try {
      await sendOTP(email, otp, authority.name);
      
      res.json({ 
        success: true, 
        message: 'OTP sent to your registered email address',
        expiresIn: '5 minutes',
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email for security
      });
    } catch (emailError) {
      // Remove from store if email sending failed
      otpStore.delete(email);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later or contact support.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
    
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Verify OTP and login authority
// @route   POST /api/authorities/login/verify-otp
// @access  Public
router.post('/login/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'OTP must be 6 digits' });
    }
    
    const record = otpStore.get(email);
    if (!record) {
      return res.status(401).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
    }

    // Check max attempts
    if (record.attempts >= record.maxAttempts) {
      otpStore.delete(email);
      return res.status(401).json({ 
        success: false, 
        message: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Check if OTP is expired
    if (record.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(401).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Check if OTP matches
    if (record.otp !== otp) {
      record.attempts += 1;
      otpStore.set(email, record);
      
      const remainingAttempts = record.maxAttempts - record.attempts;
      return res.status(401).json({ 
        success: false, 
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      });
    }
    
    // OTP is valid, clean up
    otpStore.delete(email);
    
    const authority = await Authority.findOne({ 'contact.email': email });
    if (!authority) {
      return res.status(404).json({ success: false, message: 'Authority not found' });
    }
    
    if (authority.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Authority account is not active' });
    }
    
    // Issue JWT token
    const token = jwt.sign(
      { 
        authorityId: authority._id, 
        type: 'authority',
        email: email,
        department: authority.department
      }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '24h' }
    );
    
    // Update last login
    authority.lastLogin = new Date();
    await authority.save();
    
    res.json({ 
      success: true,
      message: 'Login successful',
      token, 
      authority: { 
        id: authority._id, 
        name: authority.name, 
        email: email,
        department: authority.department,
        status: authority.status,
        lastLogin: authority.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000); // Clean up every minute

// @desc    Get all authorities
// @route   GET /api/authorities
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { department, status, page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

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

    // Get assigned issues count and stats
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
router.get('/:id/issues', optionalAuth, async (req, res) => {
  try {
    // Check if requesting authority matches the ID or if it's an admin
    if (req.authority._id.toString() !== req.params.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own assigned issues.'
      });
    }

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

// @desc    Update issue status by authority (MISSING FUNCTION - ADDED)
// @route   PUT /api/authorities/:id/issues/:issueId
// @access  Private (Authority only)
router.put('/:id/issues/:issueId', optionalAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Check if requesting authority matches the ID
    if (req.authority._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update issues assigned to you.'
      });
    }

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

    // Set resolution time if issue is being resolved
    if (status === 'resolved' && oldStatus !== 'resolved') {
      issue.resolvedAt = new Date();
      issue.actualResolutionTime = Math.floor((issue.resolvedAt - issue.createdAt) / (1000 * 60 * 60)); // in hours
    }

    await issue.save();

    // Update authority performance metrics
    if (status === 'resolved') {
      await Authority.findByIdAndUpdate(req.params.id, {
        $inc: { 'performanceMetrics.resolvedIssues': 1 },
        lastUpdated: new Date()
      });

      // Recalculate average resolution time
      const resolvedIssues = await Issue.find({
        assignedTo: req.params.id,
        status: 'resolved',
        actualResolutionTime: { $exists: true }
      });

      if (resolvedIssues.length > 0) {
        const avgTime = resolvedIssues.reduce((sum, issue) => sum + issue.actualResolutionTime, 0) / resolvedIssues.length;
        await Authority.findByIdAndUpdate(req.params.id, {
          'performanceMetrics.averageResolutionTime': Math.round(avgTime)
        });
      }
    }

    // Send notifications (if email service is available)
    try {
      if (issue.reporter && issue.reporter.email) {
        await sendIssueStatusEmail(issue.reporter, issue, status, notes);
      }
    } catch (emailError) {
      console.warn('Failed to send notification email:', emailError.message);
    }

    res.json({
      success: true,
      message: `Issue marked as ${status}`,
      data: {
        issue: {
          id: issue._id,
          status: issue.status,
          timeline: issue.timeline,
          resolvedAt: issue.resolvedAt,
          actualResolutionTime: issue.actualResolutionTime
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

// @desc    Get authority dashboard data (MISSING FUNCTION - ADDED)
// @route   GET /api/authorities/:id/dashboard
// @access  Private (Authority only)
router.get('/:id/dashboard', optionalAuth, async (req, res) => {
  try {
    // Check if requesting authority matches the ID
    if (req.authority._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own dashboard.'
      });
    }

    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    // Get issue statistics
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

    // Get recent issues (last 10)
    const recentIssues = await Issue.find({ assignedTo: authority._id })
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get performance metrics for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyStats = await Issue.aggregate([
      {
        $match: { 
          assignedTo: authority._id,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
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
      }
    ]);

    // Format statistics
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

    const monthlyData = monthlyStats[0] || {
      totalAssigned: 0,
      resolved: 0,
      avgResolutionTime: 0
    };

    res.json({
      success: true,
      data: {
        authority: {
          name: authority.name,
          department: authority.department,
          email: authority.contact.email
        },
        stats,
        monthlyStats: monthlyData,
        recentIssues: recentIssues.map(issue => ({
          _id: issue._id,
          title: issue.title,
          category: issue.category,
          status: issue.status,
          priority: issue.priority,
          createdAt: issue.createdAt,
          reporter: issue.reporter
        }))
      }
    });

  } catch (error) {
    console.error('Get authority dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
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

// @desc    Refresh OTP (MISSING FUNCTION - ADDED)
// @route   POST /api/authorities/login/refresh-otp
// @access  Public
router.post('/login/refresh-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if there's already an active OTP for this email
    const existingOTP = otpStore.get(email);
    if (existingOTP && existingOTP.expiresAt > Date.now()) {
      const remainingTime = Math.ceil((existingOTP.expiresAt - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingTime} seconds before requesting a new OTP`
      });
    }
    
    const authority = await Authority.findOne({ 'contact.email': email });
    if (!authority) {
      return res.status(404).json({ success: false, message: 'Authority not found' });
    }
    
    if (authority.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Authority account is not active' });
    }
    
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(email, { otp, expiresAt });
    
    await sendOTP(email, otp);
    
    res.json({ 
      success: true, 
      message: 'New OTP sent to authority email',
      expiresIn: '5 minutes'
    });
  } catch (error) {
    console.error('Refresh OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh OTP',
      error: error.message
    });
  }
});

// @desc    Logout authority (MISSING FUNCTION - ADDED)
// @route   POST /api/authorities/logout
// @access  Private (Authority only)
router.post('/logout', optionalAuth, async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // or store logout time in the database
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message
    });
  }
});

// @desc    Update authority profile (MISSING FUNCTION - ADDED)
// @route   PUT /api/authorities/:id/profile
// @access  Private (Authority only)
router.put('/:id/profile', optionalAuth, async (req, res) => {
  try {
    // Check if requesting authority matches the ID
    if (req.authority._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own profile.'
      });
    }

    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    // Only allow certain fields to be updated by authority
    const allowedUpdates = [
      'contact.phone', 
      'contact.alternatePhone',
      'workingHours',
      'emergencyContact',
      'notificationPreferences'
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
    ).select('-budget');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { authority: updatedAuthority }
    });

  } catch (error) {
    console.error('Update authority profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// @desc    Bulk assign issues to authority (MISSING FUNCTION - ADDED)
// @route   POST /api/authorities/:id/assign-issues
// @access  Private (Admin only)
router.post('/:id/assign-issues', protect, adminOnly, async (req, res) => {
  try {
    const { issueIds } = req.body;

    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of issue IDs to assign'
      });
    }

    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: 'Authority not found'
      });
    }

    if (authority.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign issues to inactive authority'
      });
    }

    // Check if all issues exist and are not already assigned
    const issues = await Issue.find({
      _id: { $in: issueIds },
      status: { $in: ['pending', 'verified'] }
    });

    if (issues.length !== issueIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some issues not found or already assigned'
      });
    }

    // Bulk update issues
    await Issue.updateMany(
      { _id: { $in: issueIds } },
      {
        $set: {
          assignedTo: authority._id,
          status: 'assigned',
          assignedAt: new Date()
        },
        $push: {
          timeline: {
            action: 'assigned',
            timestamp: new Date(),
            authority: authority._id,
            notes: `Assigned to ${authority.name}`
          }
        }
      }
    );

    // Update authority metrics
    await Authority.findByIdAndUpdate(req.params.id, {
      $inc: { 'performanceMetrics.totalAssignedIssues': issueIds.length },
      lastUpdated: new Date()
    });

    // Send notifications to authority
    try {
      for (const issue of issues) {
        await sendAuthorityNotificationEmail(authority, issue);
      }
    } catch (emailError) {
      console.warn('Failed to send notification emails:', emailError.message);
    }

    res.json({
      success: true,
      message: `${issueIds.length} issues assigned successfully`,
      data: {
        assignedCount: issueIds.length,
        authority: {
          name: authority.name,
          department: authority.department
        }
      }
    });

  } catch (error) {
    console.error('Bulk assign issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign issues',
      error: error.message
    });
  }
});

module.exports = router;