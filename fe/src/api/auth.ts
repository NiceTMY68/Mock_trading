import apiClient from './client';
import { User } from '../store/auth';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

/**
 * Register new user
 */
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/register', data);
  return response.data.data;
};

/**
 * Login user
 */
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/login', data);
  return response.data.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
  const response = await apiClient.post('/auth/refresh', { refreshToken });
  return response.data.data;
};

/**
 * Logout user
 */
export const logout = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/auth/logout', { refreshToken });
};

/**
 * Get current user
 */
export const getMe = async (): Promise<User> => {
  const response = await apiClient.get('/auth/me');
  return response.data.data.user;
};

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    website?: string;
  };
}

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileRequest): Promise<User> => {
  const response = await apiClient.put('/auth/profile', data);
  return response.data.data.user;
};

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Change password
 */
export const changePassword = async (data: ChangePasswordRequest): Promise<void> => {
  await apiClient.put('/auth/password', data);
};

/**
 * Export user data
 */
export const exportUserData = async (): Promise<any> => {
  const response = await apiClient.get('/auth/export');
  return response.data.data.data;
};

export interface DeleteAccountRequest {
  password: string;
}

/**
 * Delete own account
 */
export const deleteAccount = async (data: DeleteAccountRequest): Promise<void> => {
  await apiClient.delete('/auth/account', { data });
};

