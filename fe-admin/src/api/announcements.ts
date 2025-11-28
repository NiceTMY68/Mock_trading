import apiClient from './client';
import { ApiResponse } from '../types';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  startsAt?: string;
  endsAt?: string | null;
}

/**
 * Get active announcements (public)
 */
export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
  const response = await apiClient.get<ApiResponse<{ announcements: Announcement[] }>>('/announcements');
  return response.data.data.announcements;
};

/**
 * Get all announcements (admin)
 */
export const getAllAnnouncements = async (params: {
  page?: number;
  size?: number;
  isActive?: boolean;
  type?: string;
} = {}): Promise<{ announcements: Announcement[]; pagination: any }> => {
  const response = await apiClient.get<ApiResponse<{ announcements: Announcement[]; pagination: any }>>('/admin/announcements', { params });
  return response.data.data;
};

/**
 * Create announcement (admin)
 */
export const createAnnouncement = async (data: CreateAnnouncementRequest): Promise<Announcement> => {
  const response = await apiClient.post<ApiResponse<{ announcement: Announcement }>>('/admin/announcements', data);
  return response.data.data.announcement;
};

/**
 * Update announcement (admin)
 */
export const updateAnnouncement = async (id: number, data: Partial<CreateAnnouncementRequest> & { isActive?: boolean }): Promise<Announcement> => {
  const response = await apiClient.put<ApiResponse<{ announcement: Announcement }>>(`/admin/announcements/${id}`, data);
  return response.data.data.announcement;
};

/**
 * Delete announcement (admin)
 */
export const deleteAnnouncement = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/announcements/${id}`);
};

