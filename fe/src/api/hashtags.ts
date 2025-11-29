/**
 * Hashtags API
 */

import apiClient from './client';

export interface Hashtag {
  id: number;
  name: string;
  postCount: number;
  createdAt?: string;
}

export interface HashtagPost {
  id: number;
  title: string;
  content: string;
  tags: string[];
  view_count: number;
  bookmark_count: number;
  reactions_count: number;
  comments_count: number;
  author_name: string;
  author_avatar?: string;
  created_at: string;
}

/**
 * Get all hashtags
 */
export const getAllHashtags = async (
  page: number = 0,
  size: number = 50,
  sortBy: string = 'post_count'
): Promise<{ hashtags: Hashtag[]; total: number }> => {
  const { data } = await apiClient.get<{ data: { hashtags: Hashtag[]; pagination: { total: number } } }>(
    '/hashtags',
    { params: { page, size, sortBy } }
  );
  return { hashtags: data.data.hashtags, total: data.data.pagination.total };
};

/**
 * Get trending hashtags
 */
export const getTrendingHashtags = async (
  limit: number = 10,
  days: number = 7
): Promise<Hashtag[]> => {
  const { data } = await apiClient.get<{ data: { hashtags: Hashtag[] } }>(
    '/hashtags/trending',
    { params: { limit, days } }
  );
  return data.data.hashtags;
};

/**
 * Search hashtags
 */
export const searchHashtags = async (query: string, limit: number = 10): Promise<Hashtag[]> => {
  const { data } = await apiClient.get<{ data: { hashtags: Hashtag[] } }>(
    '/hashtags/search',
    { params: { q: query, limit } }
  );
  return data.data.hashtags;
};

/**
 * Get posts by hashtag
 */
export const getPostsByHashtag = async (
  hashtagName: string,
  page: number = 0,
  size: number = 20,
  sortBy: string = 'created_at'
): Promise<{ posts: HashtagPost[]; total: number; hashtag: string }> => {
  const { data } = await apiClient.get<{ data: { posts: HashtagPost[]; pagination: { total: number }; hashtag: string } }>(
    `/hashtags/${encodeURIComponent(hashtagName)}/posts`,
    { params: { page, size, sortBy } }
  );
  return { posts: data.data.posts, total: data.data.pagination.total, hashtag: data.data.hashtag };
};


