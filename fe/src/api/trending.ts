/**
 * Trending API
 */

import apiClient from './client';

export interface TrendingPost {
  id: number;
  title: string;
  content: string;
  tags: string[];
  viewCount: number;
  bookmarkCount: number;
  trendingScore: number;
  reactionsCount: number;
  commentsCount: number;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

export interface TrendingHashtag {
  id: number;
  name: string;
  postCount: number;
  recentPosts: number;
}

export interface TrendingOverview {
  posts: TrendingPost[];
  hashtags: TrendingHashtag[];
}

/**
 * Get trending overview
 */
export const getTrendingOverview = async (
  postLimit: number = 10,
  hashtagLimit: number = 10,
  days: number = 7
): Promise<TrendingOverview> => {
  const { data } = await apiClient.get<{ data: TrendingOverview }>('/trending', {
    params: { postLimit, hashtagLimit, days }
  });
  return data.data;
};

/**
 * Get trending posts
 */
export const getTrendingPosts = async (
  page: number = 0,
  size: number = 20,
  days: number = 7
): Promise<{ posts: TrendingPost[]; total: number }> => {
  const { data } = await apiClient.get<{ data: { posts: TrendingPost[]; pagination: { total: number } } }>(
    '/trending/posts',
    { params: { page, size, days } }
  );
  return { posts: data.data.posts, total: data.data.pagination.total };
};

/**
 * Get trending hashtags
 */
export const getTrendingHashtags = async (
  limit: number = 10,
  days: number = 7
): Promise<TrendingHashtag[]> => {
  const { data } = await apiClient.get<{ data: { hashtags: TrendingHashtag[] } }>(
    '/trending/hashtags',
    { params: { limit, days } }
  );
  return data.data.hashtags;
};


