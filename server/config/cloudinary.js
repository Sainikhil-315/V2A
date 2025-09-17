// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
const uploadToCloudinary = (fileBuffer, fileName, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: `voice2action/${resourceType}s/${Date.now()}_${fileName}`,
        folder: `voice2action/${resourceType}s`,
        transformation: resourceType === 'image' ? [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
          { format: 'auto' }
        ] : undefined,
        video: resourceType === 'video' ? {
          quality: 'auto',
          format: 'mp4'
        } : undefined,
        audio: resourceType === 'audio' ? {
          format: 'mp3'
        } : undefined
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            duration: result.duration
          });
        }
      }
    );

    // Create readable stream from buffer
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// Upload multiple files
const uploadMultipleFiles = async (files) => {
  const uploadPromises = files.map(file => {
    let resourceType = 'auto';
    
    // Determine resource type based on mimetype
    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      resourceType = 'video'; // Cloudinary treats audio as video resource type
    }

    return uploadToCloudinary(file.buffer, file.originalname, resourceType)
      .then(result => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 
              file.mimetype.startsWith('video/') ? 'video' : 'audio',
        url: result.url,
        publicId: result.publicId,
        filename: file.originalname,
        size: result.size,
        originalSize: file.size,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration
      }))
      .catch(error => ({
        error: true,
        filename: file.originalname,
        message: error.message
      }));
  });

  return Promise.all(uploadPromises);
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

// Delete multiple files
const deleteMultipleFiles = async (publicIds, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw error;
  }
};

// Get file info
const getFileInfo = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary file info error:', error);
    throw error;
  }
};

// Generate optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...options
  });
};

// Generate thumbnail URL for videos
const getVideoThumbnail = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width: 300, height: 200, crop: 'fill' },
      { quality: 'auto' }
    ],
    ...options
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadMultipleFiles,
  deleteFromCloudinary,
  deleteMultipleFiles,
  getFileInfo,
  getOptimizedUrl,
  getVideoThumbnail
};