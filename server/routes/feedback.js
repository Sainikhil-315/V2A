
// routes/feedback.js - Simple feedback routes
const express = require('express');
const Feedback = require('../models/Feedback');
const { body, validationResult, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const router = express.Router();


// Validation middleware
const validateFeedback = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('category')
    .optional()
    .isIn(['bug', 'feature', 'improvement', 'complaint', 'compliment', 'other'])
    .withMessage('Invalid category')
];

// @route   POST /api/feedback
// @desc    Submit feedback
// @access  Private
router.post('/', protect, validateFeedback, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { message, rating, category } = req.body;

    const feedback = new Feedback({
      user: req.user.id,
      message,
      rating,
      category: category || 'other'
    });

    await feedback.save();
    await feedback.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: feedback
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again later.'
    });
  }
});

// @route   GET /api/feedback
// @desc    Get all feedback
// @access  Private
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('rating').optional().isInt({ min: 1, max: 5 }).toInt(),
  query('category').optional().isIn(['bug', 'feature', 'improvement', 'complaint', 'compliment', 'other']),
  query('sort').optional().isIn(['createdAt', '-createdAt', 'rating', '-rating'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.rating) filter.rating = req.query.rating;
    if (req.query.category) filter.category = req.query.category;

    // Build sort
    const sort = {};
    const sortField = req.query.sort || '-createdAt';
    if (sortField.startsWith('-')) {
      sort[sortField.substring(1)] = -1;
    } else {
      sort[sortField] = 1;
    }

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .populate('user', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Feedback.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback'
    });
  }
});

module.exports = router;