/**
 * Block Users API
 */

import apiClient from './client';

export interface BlockedUser {
  id: number;
  displayName: string;
  email: string;
  avatarUrl?: string;
  blockedAt: string;
  reason?: string;
}

export interface BlockStatus {
  isBlocked: boolean;
  hasBlockedMe: boolean;
  hasBlockRelation: boolean;
}

/**
 * Block a user
 */
export const blockUser = async (userId: number, reason?: string): Promise<void> => {
  await apiClient.post(`/users/${userId}/block`, { reason });
};

/**
 * Unblock a user
 */
export const unblockUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/users/${userId}/block`);
};

/**
 * Check block status
 */
export const checkBlockStatus = async (userId: number): Promise<BlockStatus> => {
  const { data } = await apiClient.get<{ data: BlockStatus }>(`/users/${userId}/block`);
  return data.data;
};

/**
 * Get blocked users list
 */
export const getBlockedUsers = async (
  page: number = 0,
  size: number = 20
): Promise<{ users: BlockedUser[]; total: number }> => {
  const { data } = await apiClient.get<{ data: { users: BlockedUser[]; pagination: { total: number } } }>(
    '/users/blocked',
    { params: { page, size } }
  );
  return { users: data.data.users, total: data.data.pagination.total };
};


