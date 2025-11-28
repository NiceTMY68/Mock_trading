import apiClient from './client';
import { ApiResponse } from '../types';

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

export interface Follower {
  id: number;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
}

/**
 * Follow a user
 */
export const followUser = async (userId: number): Promise<FollowStatus> => {
  const response = await apiClient.post<ApiResponse<FollowStatus>>(`/users/${userId}/follow`);
  return response.data.data;
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (userId: number): Promise<FollowStatus> => {
  const response = await apiClient.delete<ApiResponse<FollowStatus>>(`/users/${userId}/follow`);
  return response.data.data;
};

/**
 * Check follow status
 */
export const checkFollowStatus = async (userId: number): Promise<FollowStatus> => {
  const response = await apiClient.get<ApiResponse<FollowStatus>>(`/users/${userId}/follow`);
  return response.data.data;
};

/**
 * Get followers of a user
 */
export const getFollowers = async (userId: number): Promise<Follower[]> => {
  const response = await apiClient.get<ApiResponse<{ followers: Follower[] }>>(`/users/${userId}/followers`);
  return response.data.data.followers;
};

/**
 * Get users that a user is following
 */
export const getFollowing = async (userId: number): Promise<Follower[]> => {
  const response = await apiClient.get<ApiResponse<{ following: Follower[] }>>(`/users/${userId}/following`);
  return response.data.data.following;
};

