/**
 * Upload Service
 * 
 * Handles file uploads with multer, image processing with sharp
 */

import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const IMAGES_DIR = path.join(UPLOAD_DIR, 'images');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

[UPLOAD_DIR, IMAGES_DIR, THUMBNAILS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2000;
const THUMBNAIL_SIZE = 300;

const generateFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10
  }
});

export const processImage = async (buffer, originalname, userId) => {
  const filename = generateFilename(originalname);
  const imagePath = path.join(IMAGES_DIR, filename);
  const thumbnailFilename = `thumb_${filename}`;
  const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);
  
  try {
    const metadata = await sharp(buffer).metadata();
    
    let processedImage = sharp(buffer);
    let finalWidth = metadata.width;
    let finalHeight = metadata.height;
    
    if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
      processedImage = processedImage.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true
      });
      
      const ratio = Math.min(
        MAX_IMAGE_DIMENSION / metadata.width,
        MAX_IMAGE_DIMENSION / metadata.height
      );
      finalWidth = Math.round(metadata.width * ratio);
      finalHeight = Math.round(metadata.height * ratio);
    }
    
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      processedImage = processedImage.jpeg({ quality: 85 });
    } else if (metadata.format === 'png') {
      processedImage = processedImage.png({ compressionLevel: 8 });
    } else if (metadata.format === 'webp') {
      processedImage = processedImage.webp({ quality: 85 });
    }
    
    await processedImage.toFile(imagePath);
    
    await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    const stats = fs.statSync(imagePath);
    
    return {
      filename,
      originalName: originalname,
      mimetype: `image/${metadata.format}`,
      size: stats.size,
      path: `images/${filename}`,
      thumbnailPath: `thumbnails/${thumbnailFilename}`,
      width: finalWidth,
      height: finalHeight,
      userId
    };
  } catch (error) {
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
    throw error;
  }
};

export const deleteFile = async (filePath, thumbnailPath) => {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    if (thumbnailPath) {
      const fullThumbnailPath = path.join(UPLOAD_DIR, thumbnailPath);
      if (fs.existsSync(fullThumbnailPath)) {
        fs.unlinkSync(fullThumbnailPath);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error deleting file:', error);
    return false;
  }
};

export const getUploadDir = () => UPLOAD_DIR;

export const validateBase64Image = (base64String) => {
  const match = base64String.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,/);
  if (!match) {
    return { valid: false, error: 'Invalid image format' };
  }
  
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  
  return { valid: true, buffer, mimetype: `image/${match[1]}` };
};

export const processBase64Image = async (base64String, userId) => {
  const validation = validateBase64Image(base64String);
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const filename = generateFilename(`paste.${validation.mimetype.split('/')[1]}`);
  
  return processImage(validation.buffer, filename, userId);
};

export default {
  upload,
  processImage,
  processBase64Image,
  deleteFile,
  getUploadDir,
  validateBase64Image
};

