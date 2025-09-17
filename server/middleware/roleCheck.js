// middleware/roleCheck.js

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Admin only access
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login first.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Check if user owns the resource or is admin
const ownerOrAdmin = (resourceField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership based on different patterns
    let resourceUserId;
    
    if (req.resource && req.resource[resourceField]) {
      // Resource loaded by previous middleware
      resourceUserId = req.resource[resourceField].toString();
    } else if (req.params.userId) {
      // Direct user ID in params
      resourceUserId = req.params.userId;
    } else if (req.body[resourceField]) {
      // Resource field in body
      resourceUserId = req.body[resourceField].toString();
    }

    if (!resourceUserId || resourceUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Check if user can modify their own profile
const selfOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login first.'
    });
  }

  const targetUserId = req.params.id || req.params.userId;
  
  if (req.user.role !== 'admin' && targetUserId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only modify your own profile.'
    });
  }

  next();
};

module.exports = {
  authorize,
  adminOnly,
  ownerOrAdmin,
  selfOnly
};