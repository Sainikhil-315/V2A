// models/Contribution.js
const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['issue_reported', 'issue_resolved', 'upvote_given', 'comment_added'],
    required: [true, 'Contribution type is required']
  },
  issue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: [true, 'Issue reference is required']
  },
  points: {
    type: Number,
    required: [true, 'Points are required'],
    min: [0, 'Points cannot be negative']
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  category: {
    type: String,
    enum: [
      'road_maintenance',
      'waste_management',
      'water_supply',
      'electricity',
      'fire_safety',
      'public_transport',
      'parks_recreation',
      'street_lighting',
      'drainage',
      'noise_pollution',
      'illegal_construction',
      'animal_control',
      'other'
    ]
  },
  metadata: {
    resolutionTime: Number, // hours taken to resolve (if applicable)
    priority: String,
    location: {
      ward: String,
      district: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient leaderboard queries
contributionSchema.index({ user: 1, month: 1, year: 1 });
contributionSchema.index({ month: 1, year: 1, points: -1 });
contributionSchema.index({ type: 1, createdAt: -1 });
contributionSchema.index({ category: 1, month: 1, year: 1 });

// Static method to get monthly leaderboard
contributionSchema.statics.getMonthlyLeaderboard = async function(month, year, limit = 10) {
  return this.aggregate([
    {
      $match: { month: month, year: year }
    },
    {
      $group: {
        _id: '$user',
        totalPoints: { $sum: '$points' },
        totalContributions: { $sum: 1 },
        categories: { $addToSet: '$category' }
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
        totalContributions: 1,
        categories: 1
      }
    },
    {
      $sort: { totalPoints: -1, totalContributions: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to get yearly leaderboard
contributionSchema.statics.getYearlyLeaderboard = async function(year, limit = 10) {
  return this.aggregate([
    {
      $match: { year: year }
    },
    {
      $group: {
        _id: '$user',
        totalPoints: { $sum: '$points' },
        totalContributions: { $sum: 1 },
        categories: { $addToSet: '$category' },
        monthlyBreakdown: {
          $push: {
            month: '$month',
            points: '$points'
          }
        }
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
        totalContributions: 1,
        categories: 1,
        monthlyBreakdown: 1
      }
    },
    {
      $sort: { totalPoints: -1, totalContributions: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to get category-wise contributions
contributionSchema.statics.getCategoryStats = async function(month, year) {
  return this.aggregate([
    {
      $match: { month: month, year: year }
    },
    {
      $group: {
        _id: '$category',
        totalPoints: { $sum: '$points' },
        totalContributions: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        category: '$_id',
        totalPoints: 1,
        totalContributions: 1,
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { totalPoints: -1 }
    }
  ]);
};

module.exports = mongoose.model('Contribution', contributionSchema);