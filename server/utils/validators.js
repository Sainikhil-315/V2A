// utils/validators.js
const Joi = require('joi');

// User registration validation
const validateUserRegistration = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.max': 'Rejection reason cannot exceed 300 characters',
        'any.required': 'Rejection reason is required when rejecting an issue'
      }),
    assignedTo: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .when('status', {
        is: 'assigned',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.pattern.base': 'Invalid authority ID',
        'any.required': 'Authority assignment is required when assigning an issue'
      }),
    estimatedResolutionTime: Joi.number()
      .positive()
      .max(8760) // Max 1 year in hours
      .optional()
  });

  return schema.validate(data);
};

// Comment validation
const validateComment = (data) => {
  const schema = Joi.object({
    message: Joi.string()
      .min(1)
      .max(300)
      .required()
      .messages({
        'string.min': 'Comment cannot be empty',
        'string.max': 'Comment cannot exceed 300 characters',
        'any.required': 'Comment message is required'
      })
  });

  return schema.validate(data);
};

// Authority creation validation
const validateAuthorityCreation = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Authority name must be at least 3 characters long',
        'string.max': 'Authority name cannot exceed 100 characters',
        'any.required': 'Authority name is required'
      }),
    department: Joi.string()
      .valid(
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
      )
      .required()
      .messages({
        'any.only': 'Please select a valid department',
        'any.required': 'Department is required'
      }),
    contact: Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Contact email is required'
        }),
      phone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{0,15}$/)
        .required()
        .messages({
          'string.pattern.base': 'Please provide a valid phone number',
          'any.required': 'Contact phone is required'
        }),
      alternatePhone: Joi.string()
        .pattern(/^[\+]?[1-9][\d]{0,15}$/)
        .optional(),
      officeAddress: Joi.string()
        .min(10)
        .max(200)
        .required()
        .messages({
          'string.min': 'Office address must be at least 10 characters long',
          'string.max': 'Office address cannot exceed 200 characters',
          'any.required': 'Office address is required'
        })
    }).required(),
    serviceArea: Joi.object({
      description: Joi.string()
        .min(10)
        .max(300)
        .required()
        .messages({
          'string.min': 'Service area description must be at least 10 characters long',
          'string.max': 'Service area description cannot exceed 300 characters',
          'any.required': 'Service area description is required'
        }),
      wards: Joi.array()
        .items(Joi.string().max(50))
        .optional(),
      districts: Joi.array()
        .items(Joi.string().max(50))
        .optional(),
      postalCodes: Joi.array()
        .items(Joi.string().pattern(/^[0-9]{6}$/))
        .optional()
    }).required()
  });

  return schema.validate(data);
};

// User profile update validation
const validateProfileUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    address: Joi.object({
      street: Joi.string().max(100).optional(),
      city: Joi.string().max(50).optional(),
      state: Joi.string().max(50).optional(),
      zipCode: Joi.string().pattern(/^[0-9]{6}$/).optional(),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional()
      }).optional()
    }).optional(),
    preferences: Joi.object({
      emailNotifications: Joi.boolean().optional(),
      smsNotifications: Joi.boolean().optional(),
      language: Joi.string().valid('en', 'hi', 'te', 'ta', 'bn').default('en').optional()
    }).optional()
  });

  return schema.validate(data);
};

// Password reset validation
const validatePasswordReset = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  });

  return schema.validate(data);
};

// Password update validation
const validatePasswordUpdate = (data) => {
  const schema = Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'any.required': 'New password is required'
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match',
        'any.required': 'Password confirmation is required'
      })
  });

  return schema.validate(data);
};

// Search and filter validation
const validateSearchFilter = (data) => {
  const schema = Joi.object({
    q: Joi.string().max(100).optional(), // Search query
    category: Joi.string()
      .valid(
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
      )
      .optional(),
    status: Joi.string()
      .valid('pending', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved', 'closed')
      .optional(),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .optional(),
    ward: Joi.string().max(50).optional(),
    district: Joi.string().max(50).optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().min(Joi.ref('dateFrom')).optional(),
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'priority', 'status')
      .default('createdAt')
      .optional(),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10).optional()
  });

  return schema.validate(data);
};

// Geolocation validation
const validateGeolocation = (data) => {
  const schema = Joi.object({
    lat: Joi.number()
      .min(-90)
      .max(90)
      .required()
      .messages({
        'number.min': 'Invalid latitude',
        'number.max': 'Invalid latitude',
        'any.required': 'Latitude is required'
      }),
    lng: Joi.number()
      .min(-180)
      .max(180)
      .required()
      .messages({
        'number.min': 'Invalid longitude',
        'number.max': 'Invalid longitude',
        'any.required': 'Longitude is required'
      }),
    radius: Joi.number()
      .positive()
      .max(50000) // Max 50km radius
      .default(1000)
      .optional()
  });

  return schema.validate(data);
};

// Bulk operations validation
const validateBulkOperation = (data) => {
  const schema = Joi.object({
    issueIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one issue ID is required',
        'array.max': 'Cannot process more than 100 issues at once',
        'string.pattern.base': 'Invalid issue ID format'
      }),
    action: Joi.string()
      .valid('verify', 'reject', 'assign', 'delete')
      .required()
      .messages({
        'any.only': 'Invalid bulk action',
        'any.required': 'Action is required'
      }),
    assignedTo: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .when('action', {
        is: 'assign',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
    reason: Joi.string()
      .max(300)
      .when('action', {
        is: Joi.valid('reject', 'delete'),
        then: Joi.required(),
        otherwise: Joi.optional()
      })
  });

  return schema.validate(data);
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateIssueSubmission,
  validateIssueStatusUpdate,
  validateComment,
  validateAuthorityCreation,
  validateProfileUpdate,
  validatePasswordReset,
  validatePasswordUpdate,
  validateSearchFilter,
  validateGeolocation,
  validateBulkOperation
};