/**
 * Bookmarks API
 */

import apiClient from './client';
import { Post } from './posts';

export interface Bookmark {
  id: number;
  post_id: number;
  collection: string;
  created_at: string;
  // Post data
  title: string;
  content: string;
  tags: string[];
  post_created_at: string;
  view_count: number;
  bookmark_count: number;
  reactions_count: number;
  comments_count: number;
  author_name: string;
  author_avatar?: string;
}

export interface BookmarkCollection {
  collection: string;
  count: number;
}

/**
 * Add bookmark
 */
export const addBookmark = async (postId: number, collection: string = 'default'): Promise<void> => {
  await apiClient.post('/bookmarks', { postId, collection });
};

/**
 * Remove bookmark
 */
export const removeBookmark = async (postId: number): Promise<void> => {
  await apiClient.delete(`/bookmarks/${postId}`);
};

/**
 * Check if bookmarked
 */
export const checkBookmark = async (postId: number): Promise<boolean> => {
  const { data } = await apiClient.get<{ data: { isBookmarked: boolean } }>(`/bookmarks/check/${postId}`);
  return data.data.isBookmarked;
};

/**
 * Get bookmarks
 */
export const getBookmarks = async (
  page: number = 0,
  size: number = 20,
  collection?: string
): Promise<{ bookmarks: Bookmark[]; total: number }> => {
  const { data } = await apiClient.get<{ data: { bookmarks: Bookmark[]; pagination: { total: number } } }>(
    '/bookmarks',
    { params: { page, size, collection } }
  );
  return { bookmarks: data.data.bookmarks, total: data.data.pagination.total };
};

/**
 * Get collections
 */
export const getCollections = async (): Promise<BookmarkCollection[]> => {
  const { data } = await apiClient.get<{ data: { collections: BookmarkCollection[] } }>('/bookmarks/collections');
  return data.data.collections;
};

/**
 * Move bookmark to collection
 */
export const moveToCollection = async (postId: number, collection: string): Promise<void> => {
  await apiClient.put(`/bookmarks/${postId}/collection`, { collection });
};


