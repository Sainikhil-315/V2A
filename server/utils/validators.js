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
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      }),
    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{9,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    role: Joi.string()
      .valid('citizen', 'admin')
      .default('citizen')
      .optional()
      .messages({
        'any.only': 'Role must be either citizen or admin'
      }),
    acceptTerms: Joi.boolean().valid(true).required().messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    })

  });

  return schema.validate(data);
};

// User Login
const validateUserLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      })
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
// Profile update validation
const validateIssueSubmission = (data) => {
  // If location is a string (from frontend), parse it
  let parsed = { ...data };
  if (typeof data.location === 'string') {
    try {
      parsed.location = JSON.parse(data.location);
    } catch (e) {
      // fallback: leave as is, validation will fail
    }
  }
  const schema = Joi.object({
    title: Joi.string().min(5).max(100).required().messages({
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),
    description: Joi.string().min(10).max(1000).required().messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required'
    }),
    category: Joi.string().valid(
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
    ).required().messages({
      'any.only': 'Invalid category',
      'any.required': 'Category is required'
    }),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    location: Joi.object({
      address: Joi.string().max(200).required().messages({
        'any.required': 'Location address is required',
        'string.max': 'Location address cannot exceed 200 characters'
      }),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required().messages({
          'any.required': 'Latitude is required',
          'number.min': 'Invalid latitude',
          'number.max': 'Invalid latitude'
        }),
        lng: Joi.number().min(-180).max(180).required().messages({
          'any.required': 'Longitude is required',
          'number.min': 'Invalid longitude',
          'number.max': 'Invalid longitude'
        })
      }).required(),
      landmark: Joi.string().max(100).optional(),
      ward: Joi.string().max(50).optional(),
      district: Joi.string().max(50).optional()
    }).required(),
    anonymous: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string().max(30)).optional(),
    visibility: Joi.string().valid('public', 'private').default('public').optional(),
    // media, voice, files handled by multer/cloudinary, not validated here
  });
  return schema.validate(parsed);
};
const validateProfileUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
      }),

    phone: Joi.string()
      .pattern(/^[\+]?[1-9][\d]{0,15}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    address: Joi.object({
      street: Joi.string().max(100).optional(),
      city: Joi.string().max(50).optional(),
      state: Joi.string().max(50).optional(),
      zipCode: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .optional()
        .messages({
          'string.pattern.base': 'Zip code must be a 6-digit number',
        }),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
      }).optional(),
    }).optional(),

    preferences: Joi.object({
      emailNotifications: Joi.boolean().optional(),
      smsNotifications: Joi.boolean().optional(),
      language: Joi.string()
        .valid('en', 'hi', 'te', 'ta', 'bn')
        .default('en')
        .optional(),
    }).optional(),

    location: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Location cannot exceed 100 characters',
      }),

    bio: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Bio must be less than 500 characters',
      }),
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
  // validateIssueStatusUpdate,
  validateComment,
  validateAuthorityCreation,
  validateProfileUpdate,
  validatePasswordReset,
  validatePasswordUpdate,
  validateSearchFilter,
  validateGeolocation,
  validateBulkOperation
};