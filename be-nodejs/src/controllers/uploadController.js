/**
 * Upload Controller
 * 
 * Handles file uploads
 */

import { UploadModel } from '../models/uploadModel.js';
import { processImage, processBase64Image, deleteFile } from '../services/uploadService.js';
import { logger } from '../utils/logger.js';
import { createResponse } from '../utils/response.js';

/**
 * Upload single image
 * POST /api/uploads/image
 */
export const uploadImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json(createResponse(false, 'No file uploaded'));
    }
    
    // Process image
    const imageData = await processImage(
      req.file.buffer,
      req.file.originalname,
      userId
    );
    
    // Save to database
    const upload = await UploadModel.create({
      ...imageData,
      uploadType: req.body.type || 'post'
    });
    
    logger.info(`Image uploaded: ${upload.filename} by user ${userId}`);
    
    res.status(201).json(createResponse(true, 'Image uploaded', {
      upload: {
        id: upload.id,
        filename: upload.filename,
        url: `/uploads/${upload.path}`,
        thumbnailUrl: upload.thumbnail_path ? `/uploads/${upload.thumbnail_path}` : null,
        width: upload.width,
        height: upload.height,
        size: upload.size
      }
    }));
  } catch (error) {
    logger.error('Upload image error:', error);
    res.status(500).json(createResponse(false, error.message || 'Failed to upload image'));
  }
};

/**
 * Upload multiple images
 * POST /api/uploads/images
 */
export const uploadMultipleImages = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(createResponse(false, 'No files uploaded'));
    }
    
    const uploads = [];
    const errors = [];
    
    for (const file of req.files) {
      try {
        const imageData = await processImage(file.buffer, file.originalname, userId);
        const upload = await UploadModel.create({
          ...imageData,
          uploadType: req.body.type || 'post'
        });
        
        uploads.push({
          id: upload.id,
          filename: upload.filename,
          url: `/uploads/${upload.path}`,
          thumbnailUrl: upload.thumbnail_path ? `/uploads/${upload.thumbnail_path}` : null,
          width: upload.width,
          height: upload.height,
          size: upload.size
        });
      } catch (err) {
        errors.push({ filename: file.originalname, error: err.message });
      }
    }
    
    logger.info(`${uploads.length} images uploaded by user ${userId}`);
    
    res.status(201).json(createResponse(true, `${uploads.length} images uploaded`, {
      uploads,
      errors: errors.length > 0 ? errors : undefined
    }));
  } catch (error) {
    logger.error('Upload multiple images error:', error);
    res.status(500).json(createResponse(false, error.message || 'Failed to upload images'));
  }
};

/**
 * Upload base64 image (for paste functionality)
 * POST /api/uploads/paste
 */
export const uploadBase64 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { image, type = 'post' } = req.body;
    
    if (!image) {
      return res.status(400).json(createResponse(false, 'No image data provided'));
    }
    
    // Process base64 image
    const imageData = await processBase64Image(image, userId);
    
    // Save to database
    const upload = await UploadModel.create({
      ...imageData,
      uploadType: type
    });
    
    logger.info(`Base64 image uploaded: ${upload.filename} by user ${userId}`);
    
    res.status(201).json(createResponse(true, 'Image uploaded', {
      upload: {
        id: upload.id,
        filename: upload.filename,
        url: `/uploads/${upload.path}`,
        thumbnailUrl: upload.thumbnail_path ? `/uploads/${upload.thumbnail_path}` : null,
        width: upload.width,
        height: upload.height,
        size: upload.size
      }
    }));
  } catch (error) {
    logger.error('Upload base64 image error:', error);
    res.status(500).json(createResponse(false, error.message || 'Failed to upload image'));
  }
};

/**
 * Get user's uploads
 * GET /api/uploads
 */
export const getUploads = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 0, size = 20, type = null } = req.query;
    
    const uploads = await UploadModel.getByUserId(userId, {
      page: parseInt(page),
      size: parseInt(size),
      uploadType: type
    });
    
    res.json(createResponse(true, 'Uploads retrieved', {
      uploads: uploads.map(u => ({
        id: u.id,
        filename: u.filename,
        originalName: u.original_name,
        url: `/uploads/${u.path}`,
        thumbnailUrl: u.thumbnail_path ? `/uploads/${u.thumbnail_path}` : null,
        width: u.width,
        height: u.height,
        size: u.size,
        type: u.upload_type,
        createdAt: u.created_at
      }))
    }));
  } catch (error) {
    logger.error('Get uploads error:', error);
    res.status(500).json(createResponse(false, 'Failed to get uploads'));
  }
};

/**
 * Delete upload
 * DELETE /api/uploads/:id
 */
export const deleteUpload = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    // Get upload to get file paths
    const upload = await UploadModel.getById(parseInt(id));
    
    if (!upload) {
      return res.status(404).json(createResponse(false, 'Upload not found'));
    }
    
    if (upload.user_id !== userId) {
      return res.status(403).json(createResponse(false, 'Not authorized'));
    }
    
    // Delete from database
    await UploadModel.delete(parseInt(id), userId);
    
    // Delete files
    await deleteFile(upload.path, upload.thumbnail_path);
    
    logger.info(`Upload deleted: ${upload.filename} by user ${userId}`);
    
    res.json(createResponse(true, 'Upload deleted'));
  } catch (error) {
    logger.error('Delete upload error:', error);
    res.status(500).json(createResponse(false, 'Failed to delete upload'));
  }
};

/**
 * Get storage stats
 * GET /api/uploads/stats
 */
export const getStorageStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await UploadModel.getStorageStats(userId);
    
    res.json(createResponse(true, 'Storage stats retrieved', { stats }));
  } catch (error) {
    logger.error('Get storage stats error:', error);
    res.status(500).json(createResponse(false, 'Failed to get storage stats'));
  }
};

/**
 * Get images for a post
 * GET /api/uploads/post/:postId
 */
export const getPostImages = async (req, res) => {
  try {
    const { postId } = req.params;
    const images = await UploadModel.getByPostId(parseInt(postId));
    
    res.json(createResponse(true, 'Post images retrieved', { images }));
  } catch (error) {
    logger.error('Get post images error:', error);
    res.status(500).json(createResponse(false, 'Failed to get post images'));
  }
};

