// models/Issue.js
const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Issue title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
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
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  location: {
    address: {
      type: String,
      required: [true, 'Location address is required']
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: [-90, 'Invalid latitude'],
        max: [90, 'Invalid latitude']
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: [-180, 'Invalid longitude'],
        max: [180, 'Invalid longitude']
      }
    },
    landmark: String,
    ward: String,
    district: String
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    publicId: String, // Cloudinary public ID
    filename: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Authority',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  rejectionReason: {
    type: String,
    maxlength: [300, 'Rejection reason cannot exceed 300 characters']
  },
  timeline: [{
    action: {
      type: String,
      enum: ['submitted', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    authority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Authority'
    },
    notes: String
  }],
  upvotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [300, 'Comment cannot exceed 300 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  estimatedResolutionTime: {
    type: Number, // in hours
    default: null
  },
  actualResolutionTime: {
    type: Number, // in hours
    default: null
  },
  tags: [String],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
issueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add timeline entry when status changes
issueSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      action: this.status,
      timestamp: new Date(),
      notes: this.adminNotes || ''
    });
  }
  next();
});

// Calculate actual resolution time when resolved
issueSchema.pre('save', function(next) {
  if (this.status === 'resolved' && !this.actualResolutionTime) {
    const resolutionTime = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60); // hours
    this.actualResolutionTime = Math.round(resolutionTime * 100) / 100;
  }
  next();
});

// Indexes for efficient queries
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ reporter: 1, createdAt: -1 });
issueSchema.index({ assignedTo: 1, status: 1 });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index
issueSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('Issue', issueSchema);