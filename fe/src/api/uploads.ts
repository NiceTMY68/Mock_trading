/**
 * Upload API
 */

import apiClient from './client';

export interface Upload {
  id: number;
  filename: string;
  originalName?: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  type?: string;
  createdAt?: string;
}

export interface UploadResponse {
  upload: Upload;
}

export interface MultiUploadResponse {
  uploads: Upload[];
  errors?: Array<{ filename: string; error: string }>;
}

/**
 * Upload single image (file)
 */
export const uploadImage = async (file: File, type: string = 'post'): Promise<Upload> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', type);

  const { data } = await apiClient.post<{ data: UploadResponse }>('/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data.data.upload;
};

/**
 * Upload multiple images
 */
export const uploadImages = async (files: File[], type: string = 'post'): Promise<MultiUploadResponse> => {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));
  formData.append('type', type);

  const { data } = await apiClient.post<{ data: MultiUploadResponse }>('/uploads/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data.data;
};

/**
 * Upload base64 image (for paste)
 */
export const uploadBase64 = async (base64: string, type: string = 'post'): Promise<Upload> => {
  const { data } = await apiClient.post<{ data: UploadResponse }>('/uploads/paste', {
    image: base64,
    type
  });

  return data.data.upload;
};

/**
 * Get user's uploads
 */
export const getUploads = async (page: number = 0, size: number = 20): Promise<Upload[]> => {
  const { data } = await apiClient.get<{ data: { uploads: Upload[] } }>('/uploads', {
    params: { page, size }
  });

  return data.data.uploads;
};

/**
 * Delete upload
 */
export const deleteUpload = async (id: number): Promise<void> => {
  await apiClient.delete(`/uploads/${id}`);
};

/**
 * Get images for a post
 */
export const getPostImages = async (postId: number): Promise<Upload[]> => {
  const { data } = await apiClient.get<{ data: { images: Upload[] } }>(`/uploads/post/${postId}`);
  return data.data.images;
};


