import apiClient from './client';

export interface PostImage {
  id: number;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface Post {
  id: number;
  userId: number;
  title: string;
  content: string;
  tags: string[];
  mentions: string[];
  status: 'draft' | 'published' | 'archived';
  authorName?: string;
  authorAvatar?: string;
  commentsCount?: number;
  reactionsCount?: number;
  viewCount?: number;
  bookmarkCount?: number;
  images?: PostImage[];
  hashtags?: string[];
  userReaction?: string | null;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  parentId?: number;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  id: number;
  userId: number;
  postId: number;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  userName?: string;
  userAvatar?: string;
  createdAt: string;
}

export interface PostWithDetails extends Omit<Post, 'userReaction'> {
  reactions: Reaction[];
  comments: Comment[];
  userReaction?: Reaction | null;
}

export interface CreatePostRequest {
  title?: string;
  content: string;
  tags?: string[];
  mentions?: string[];
  imageIds?: number[];
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  tags?: string[];
  mentions?: string[];
  status?: 'draft' | 'published' | 'archived';
  imageIds?: number[];
}

export interface CreateCommentRequest {
  content: string;
  parentId?: number;
}

/**
 * Get posts with pagination
 */
export const getPosts = async (params?: {
  page?: number;
  size?: number;
  userId?: number;
  status?: string;
  sortBy?: string;
  order?: string;
  search?: string;
  followingOnly?: boolean;
  hashtag?: string;
}): Promise<{ posts: Post[]; pagination: any }> => {
  const response = await apiClient.get('/posts', { params });
  return response.data.data;
};

/**
 * Get single post with details
 */
export const getPost = async (id: number): Promise<PostWithDetails> => {
  const response = await apiClient.get(`/posts/${id}`);
  return response.data.data.post;
};

/**
 * Create new post
 */
export const createPost = async (data: CreatePostRequest): Promise<Post> => {
  const response = await apiClient.post('/posts', data);
  return response.data.data.post;
};

/**
 * Update post
 */
export const updatePost = async (id: number, data: UpdatePostRequest): Promise<Post> => {
  const response = await apiClient.put(`/posts/${id}`, data);
  return response.data.data.post;
};

/**
 * Delete post
 */
export const deletePost = async (id: number): Promise<void> => {
  await apiClient.delete(`/posts/${id}`);
};

/**
 * Get comments for a post
 */
export const getComments = async (postId: number): Promise<Comment[]> => {
  const response = await apiClient.get(`/posts/${postId}/comments`);
  return response.data.data.comments;
};

/**
 * Create comment
 */
export const createComment = async (postId: number, data: CreateCommentRequest): Promise<Comment> => {
  const response = await apiClient.post(`/posts/${postId}/comments`, data);
  return response.data.data.comment;
};

/**
 * Update comment
 */
export const updateComment = async (id: number, content: string): Promise<Comment> => {
  const response = await apiClient.put(`/comments/${id}`, { content });
  return response.data.data.comment;
};

/**
 * Delete comment
 */
export const deleteComment = async (id: number): Promise<void> => {
  await apiClient.delete(`/comments/${id}`);
};

/**
 * Toggle reaction on post
 */
export const toggleReaction = async (postId: number, type: string = 'like'): Promise<{
  reaction: Reaction | null;
  counts: Record<string, number>;
}> => {
  const response = await apiClient.post(`/posts/${postId}/reactions`, { type });
  return response.data.data;
};

/**
 * Get reactions for a post
 */
export const getReactions = async (postId: number): Promise<{
  reactions: Reaction[];
  counts: Record<string, number>;
  userReaction: Reaction | null;
}> => {
  const response = await apiClient.get(`/posts/${postId}/reactions`);
  return response.data.data;
};
