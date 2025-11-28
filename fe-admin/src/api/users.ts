import apiClient from './client';
import { ApiResponse } from '../types';

export interface PublicUserProfile {
  id: number;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  socialLinks?: {
    twitter?: string;
    github?: string;
    website?: string;
  };
  createdAt: string;
  stats: {
    postsCount: number;
    commentsCount: number;
  };
}

/**
 * Get public user profile
 */
export const getPublicProfile = async (userId: number): Promise<PublicUserProfile> => {
  const response = await apiClient.get<ApiResponse<{ user: PublicUserProfile }>>(`/users/${userId}`);
  return response.data.data.user;
};

