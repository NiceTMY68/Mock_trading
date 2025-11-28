/**
 * Navigation utility functions
 * Provides consistent navigation across the app
 */

/**
 * Navigate to a path without full page reload
 */
export const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/**
 * Navigate to a path with query params
 */
export const navigateWithQuery = (path: string, params: Record<string, string | number | null | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;
  navigate(fullPath);
};

/**
 * Get current path
 */
export const getCurrentPath = (): string => {
  return window.location.pathname;
};

/**
 * Get query params from URL
 */
export const getQueryParams = (): URLSearchParams => {
  return new URLSearchParams(window.location.search);
};

/**
 * Get a specific query param
 */
export const getQueryParam = (key: string): string | null => {
  return getQueryParams().get(key);
};

/**
 * Check if current path matches a pattern
 */
export const isActivePath = (path: string, exact = false): boolean => {
  const currentPath = getCurrentPath();
  if (exact) {
    return currentPath === path;
  }
  return currentPath.startsWith(path);
};

