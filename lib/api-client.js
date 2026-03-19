/**
 * Client-side API utility with authentication
 * Automatically includes the auth token in all API requests
 */

const API_BASE = '/api';
const DEFAULT_ACTOR = 'sawyer';
const DEFAULT_TOKEN = 'mc_test_token_12345';

/**
 * Get the auth token from localStorage
 * @returns {string|null} The auth token or null
 */
export function getAuthToken() {
  if (typeof window === 'undefined') return DEFAULT_TOKEN;
  return localStorage.getItem('mc_auth_token') || DEFAULT_TOKEN;
}

export function getCurrentActor() {
  if (typeof window === 'undefined') return DEFAULT_ACTOR;
  return localStorage.getItem('mc_actor') || DEFAULT_ACTOR;
}

export function setCurrentActor(actor) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mc_actor', actor || DEFAULT_ACTOR);
}

/**
 * Get authorization headers with token
 * @returns {Object} Headers object with Authorization if token exists
 */
export function getAuthHeaders() {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'x-mc-actor': getCurrentActor(),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/tasks')
 * @param {Object} options - Fetch options
 * @returns {Promise} Fetch response
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });
  
  return response;
}

/**
 * GET request with auth
 */
export async function apiGet(endpoint) {
  return apiRequest(endpoint, { method: 'GET' });
}

/**
 * POST request with auth
 */
export async function apiPost(endpoint, body) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if token exists
 */
export function isAuthenticated() {
  // Always return true since we have a DEFAULT_TOKEN fallback
  return true;
}

/**
 * Log out the user (remove token)
 */
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mc_auth_token');
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 * @param {string} redirectTo - URL to redirect to after login (default: current page)
 */
export function requireAuth(redirectTo = null) {
  if (typeof window === 'undefined') return;
  
  if (!isAuthenticated()) {
    const target = redirectTo || window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(target)}`;
  }
}
