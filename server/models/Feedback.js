// models/Feedback.js - Simple feedback model
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  category: {
    type: String,
    enum: ['bug', 'feature', 'improvement', 'complaint', 'compliment', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);