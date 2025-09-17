// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|avi|mkv|mov|webm/;
  const allowedAudioTypes = /mp3|wav|ogg|m4a/;

  const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
                  allowedVideoTypes.test(path.extname(file.originalname).toLowerCase()) ||
                  allowedAudioTypes.test(path.extname(file.originalname).toLowerCase());

  const mimetype = file.mimetype.startsWith('image/') ||
                   file.mimetype.startsWith('video/') ||
                   file.mimetype.startsWith('audio/');

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image, video, and audio files are allowed!'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
    files: parseInt(process.env.MAX_FILES) || 5 // 5 files max
  },
  fileFilter: fileFilter
});

// Multiple files upload middleware
const uploadMultiple = upload.array('media', 5);

// Single file upload middleware
const uploadSingle = upload.single('file');

// Profile image upload
const uploadAvatar = upload.single('avatar');

// Enhanced upload middleware with error handling
const handleMultipleUpload = (req, res, next) => {
  uploadMultiple(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB per file.'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 5 files allowed.'
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name for file upload.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + error.message
      });
    } else if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Validate file types more thoroughly
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        // Check file size again
        if (file.size > 10485760) {
          return res.status(400).json({
            success: false,
            message: `File ${file.originalname} is too large. Maximum size is 10MB.`
          });
        }

        // Validate MIME types
        const validMimeTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/avi', 'video/quicktime', 'video/webm',
          'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'
        ];

        if (!validMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: `File type ${file.mimetype} is not supported.`
          });
        }
      }
    }

    next();
  });
};

// Single file upload with error handling
const handleSingleUpload = (req, res, next) => {
  uploadSingle(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + error.message
      });
    } else if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next();
  });
};

// Avatar upload with error handling
const handleAvatarUpload = (req, res, next) => {
  uploadAvatar(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Avatar image too large. Maximum size is 10MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Avatar upload error: ' + error.message
      });
    } else if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Validate avatar is image only
    if (req.file && !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Avatar must be an image file.'
      });
    }

    next();
  });
};

module.exports = {
  handleMultipleUpload,
  handleSingleUpload,
  handleAvatarUpload,
  upload
};