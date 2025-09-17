// models/Authority.js
const mongoose = require('mongoose');

const authoritySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Authority name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
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
      'municipal_corporation',
      'police',
      'other'
    ]
  },
  contact: {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    alternatePhone: {
      type: String,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    officeAddress: {
      type: String,
      required: [true, 'Office address is required']
    }
  },
  serviceArea: {
    description: {
      type: String,
      required: [true, 'Service area description is required']
    },
    boundaries: {
      type: {
        type: String,
        enum: ['Polygon', 'MultiPolygon'],
        default: 'Polygon'
      },
      coordinates: {
        type: [[[Number]]], // GeoJSON format
        required: [true, 'Service boundaries are required']
      }
    },
    wards: [String],
    districts: [String],
    postalCodes: [String]
  },
  workingHours: {
    monday: { start: String, end: String },
    tuesday: { start: String, end: String },
    wednesday: { start: String, end: String },
    thursday: { start: String, end: String },
    friday: { start: String, end: String },
    saturday: { start: String, end: String },
    sunday: { start: String, end: String }
  },
  emergencyContact: {
    available247: {
      type: Boolean,
      default: false
    },
    phone: String,
    email: String
  },
  performanceMetrics: {
    totalAssignedIssues: {
      type: Number,
      default: 0
    },
    resolvedIssues: {
      type: Number,
      default: 0
    },
    averageResolutionTime: {
      type: Number, // in hours
      default: 0
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    responseRate: {
      type: Number, // percentage
      default: 100
    }
  },
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    urgentOnly: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  headOfDepartment: {
    name: String,
    designation: String,
    contact: String
  },
  budget: {
    annual: Number,
    allocated: Number,
    spent: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index service area for geospatial queries
authoritySchema.index({ 'serviceArea.boundaries': '2dsphere' });
authoritySchema.index({ department: 1, status: 1 });
authoritySchema.index({ 'performanceMetrics.rating': -1 });

// Method to check if a location is within service area
authoritySchema.methods.isLocationInServiceArea = function(lat, lng) {
  // This would use turf.js in the actual implementation
  // For now, return true as placeholder
  return true;
};

// Method to update performance metrics
authoritySchema.methods.updateMetrics = function() {
  // Calculate average resolution time, response rate etc.
  this.lastUpdated = new Date();
  return this.save();
};

module.exports = mongoose.model('Authority', authoritySchema);