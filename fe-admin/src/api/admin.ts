import apiClient from './client';
import { ApiResponse, PaginationMeta } from '../types';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    recentRegistrations: number;
  };
  posts: {
    total: number;
    pending: number;
    recent: number;
  };
  comments: {
    total: number;
  };
  reports: {
    total: number;
    pending: number;
  };
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  avatarUrl?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  stats: {
    postsCount: number;
    commentsCount: number;
    watchlistsCount: number;
  };
}

export interface AdminPost {
  id: number;
  title: string;
  content: string;
  status: 'pending' | 'published' | 'rejected' | 'archived';
  tags: string[];
  mentions: string[];
  authorName: string;
  authorEmail: string;
  authorRole: string;
  commentsCount: number;
  reactionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemLog {
  id: number;
  level: string;
  message: string;
  metadata?: any;
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

/**
 * Get admin dashboard stats
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<ApiResponse<{ stats: DashboardStats }>>('/admin/dashboard');
  return response.data.data.stats;
};

/**
 * Get all users
 */
export const getAllUsers = async (params: {
  page?: number;
  size?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
} = {}): Promise<{ users: AdminUser[]; pagination: PaginationMeta }> => {
  const response = await apiClient.get<ApiResponse<{ users: AdminUser[]; pagination: PaginationMeta }>>('/admin/users', {
    params
  });
  return response.data.data;
};

/**
 * Get user details
 */
export const getUserDetails = async (userId: number): Promise<AdminUser> => {
  const response = await apiClient.get<ApiResponse<{ user: AdminUser }>>(`/admin/users/${userId}`);
  return response.data.data.user;
};

/**
 * Update user
 */
export const updateUser = async (userId: number, data: {
  displayName?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
  bio?: string;
  avatarUrl?: string;
}): Promise<AdminUser> => {
  const response = await apiClient.put<ApiResponse<{ user: AdminUser }>>(`/admin/users/${userId}`, data);
  return response.data.data.user;
};

/**
 * Delete user
 */
export const deleteUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/admin/users/${userId}`);
};

/**
 * Get posts for moderation
 */
export const getPostsForModeration = async (params: {
  page?: number;
  size?: number;
  status?: string;
  search?: string;
} = {}): Promise<{ posts: AdminPost[]; pagination: PaginationMeta }> => {
  const response = await apiClient.get<ApiResponse<{ posts: AdminPost[]; pagination: PaginationMeta }>>('/admin/posts', {
    params
  });
  return response.data.data;
};

/**
 * Update post status
 */
export const updatePostStatus = async (postId: number, status: 'pending' | 'published' | 'rejected' | 'archived'): Promise<void> => {
  await apiClient.put(`/admin/posts/${postId}/status`, { status });
};

/**
 * Delete post
 */
export const deletePost = async (postId: number): Promise<void> => {
  await apiClient.delete(`/admin/posts/${postId}`);
};

/**
 * Delete comment
 */
export const deleteComment = async (commentId: number): Promise<void> => {
  await apiClient.delete(`/admin/comments/${commentId}`);
};

/**
 * Get system logs
 */
export const getSystemLogs = async (params: {
  level?: string;
  userId?: number;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<SystemLog[]> => {
  const response = await apiClient.get<ApiResponse<{ logs: SystemLog[] }>>('/admin/logs', { params });
  return response.data.data.logs;
};

/**
 * Get log statistics
 */
export const getLogStats = async (days = 7): Promise<{ level: string; count: number }[]> => {
  const response = await apiClient.get<ApiResponse<{ counts: { level: string; count: number }[] }>>('/admin/logs/stats', {
    params: { days }
  });
  return response.data.data.counts;
};

/**
 * Pin/unpin post
 */
export const togglePinPost = async (postId: number, pinned: boolean): Promise<void> => {
  await apiClient.put(`/admin/posts/${postId}/pin`, { pinned });
};

/**
 * Feature/unfeature post
 */
export const toggleFeaturePost = async (postId: number, featured: boolean): Promise<void> => {
  await apiClient.put(`/admin/posts/${postId}/feature`, { featured });
};

/**
 * Force logout user (revoke all tokens)
 */
export const forceLogoutUser = async (userId: number): Promise<void> => {
  await apiClient.post(`/admin/users/${userId}/logout`);
};

/**
 * Invalidate cache
 */
export const invalidateCache = async (pattern?: string): Promise<{ deletedCount: number }> => {
  const response = await apiClient.post<ApiResponse<{ deletedCount: number }>>('/admin/cache/invalidate', { pattern });
  return response.data.data;
};

/**
 * Get cache stats
 */
export const getCacheStats = async (): Promise<{
  available: boolean;
  totalKeys?: number;
  binanceKeys?: number;
  newsKeys?: number;
  otherKeys?: number;
  message?: string;
}> => {
  const response = await apiClient.get<ApiResponse<{ stats: any }>>('/admin/cache/stats');
  return response.data.data.stats;
};


/**
 * Get failed login attempts (admin)
 */
export const getFailedLogins = async (params: {
  page?: number;
  size?: number;
  email?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<{ attempts: any[]; pagination: PaginationMeta }> => {
  const response = await apiClient.get<ApiResponse<{ attempts: any[]; pagination: PaginationMeta }>>('/admin/security/failed-logins', { params });
  return response.data.data;
};

/**
 * Get security stats (admin)
 */
export const getSecurityStats = async (days = 7): Promise<{
  stats: {
    totalAttempts: number;
    uniqueEmails: number;
    uniqueIPs: number;
    lastAttempt: string;
  };
  topFailedEmails: Array<{ email: string; attempt_count: number }>;
  topFailedIPs: Array<{ ip_address: string; attempt_count: number }>;
}> => {
  const response = await apiClient.get<ApiResponse<any>>('/admin/security/stats', { params: { days } });
  return response.data.data;
};

