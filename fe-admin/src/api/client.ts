import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // Increased to 20 seconds for slower operations (migrations, heavy queries)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track refresh attempts to prevent infinite loops
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Add response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle rate limiting (429) with better messaging
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.warn(
        `API Rate Limited. ${retryAfter ? `Retry after ${retryAfter} seconds.` : 'Please wait before making more requests.'}`
      );
    } else if (error.code === 'ECONNABORTED') {
      console.warn('API Request timeout. Backend may be slow or unavailable.');
    } else if (error.code === 'ERR_NETWORK' || !error.response) {
      console.warn('API Network error. Backend may not be running.');
    } else if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh for the refresh endpoint itself
      if (originalRequest.url?.includes('/auth/refresh')) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const { refreshToken } = useAuthStore.getState();

      if (refreshToken) {
        // If already refreshing, wait for the refresh to complete
        if (isRefreshing) {
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            });
          });
        }

        isRefreshing = true;
        
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { token, refreshToken: newRefreshToken } = response.data.data;
          
          useAuthStore.getState().setAuth(
            useAuthStore.getState().user!,
            token,
            newRefreshToken
          );

          isRefreshing = false;
          onRefreshed(token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch (refreshError: any) {
          isRefreshing = false;
          refreshSubscribers = [];
          
          // Only clear auth if refresh explicitly failed (not network error)
          if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
            useAuthStore.getState().clearAuth();
            // Navigate to home instead of /login (we use modal for login)
            if (window.location.pathname !== '/') {
              window.location.href = '/';
            }
          }
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

