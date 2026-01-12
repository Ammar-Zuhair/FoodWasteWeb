/**
 * Authentication API Service
 */
import { API_CONFIG } from '../../config/api.config.js';
import { findWorkingIP, POSSIBLE_IPS } from '../../config/api.config.js';
import { isNative } from '../../utils/capacitor.js';

const BASE_URL = `${API_CONFIG.baseURL}/api/v1/auth`;

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Login response with token and user info
 */
export async function login(username, password) {
  // إذا كان التطبيق محمولاً، جرب البحث عن IP صحيح عند فشل الاتصال
  const isNativeApp = isNative();

  let lastError = null;
  let triedIPs = [];

  // إذا كان تطبيق محمول، جرب IPs مختلفة
  if (isNativeApp) {
    // أولاً، جرب IP الحالي
    triedIPs.push(API_CONFIG.baseURL);

    try {
      return await attemptLogin(`${API_CONFIG.baseURL}/api/v1/auth/login`, username, password);
    } catch (error) {
      lastError = error;
      console.warn('[Auth API] Failed with current IP, trying to find working IP...');

      // جرب البحث عن IP صحيح
      const workingIP = await findWorkingIP();
      if (workingIP) {
        const newBaseURL = `http://${workingIP}:8000`;
        triedIPs.push(newBaseURL);
        console.log(`[Auth API] Found working IP: ${workingIP}, retrying login...`);
        try {
          return await attemptLogin(`${newBaseURL}/api/v1/auth/login`, username, password);
        } catch (retryError) {
          lastError = retryError;
        }
      }
    }
  } else {
    // للويب، استخدم IP الحالي فقط
    return await attemptLogin(`${BASE_URL}/login`, username, password);
  }

  // إذا فشل كل شيء، أظهر رسالة خطأ واضحة
  if (lastError) {
    const currentIP = API_CONFIG.baseURL.replace('http://', '').replace(':8000', '');
    throw new Error(`لا يمكن الاتصال بالخادم. تأكد من أن Backend يعمل على http://${currentIP}:8000`);
  }

  throw lastError || new Error('فشل تسجيل الدخول');
}

/**
 * محاولة تسجيل الدخول مع URL معين
 */
async function attemptLogin(url, username, password) {
  console.log(`[Auth API] Attempting login to: ${url}`);
  console.log(`[Auth API] Username: ${username}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[Auth API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error(`[Auth API] Login failed:`, errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Auth API] Login successful, user:`, data.user?.username);

    // Store token and user info
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log(`[Auth API] Token and user stored in localStorage`);
      }
    } catch (e) {
      console.warn('Error storing auth data:', e);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Auth API] Request timeout - Backend may be down or unreachable');
      throw new Error('انتهت مهلة الاتصال. تأكد من أن Backend يعمل');
    }
    throw error;
  }
}

/**
 * Get current user info
 * @returns {Promise<Object>} Current user information
 */
export async function getCurrentUser() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        logout();
        throw new Error('Session expired');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

/**
 * Logout user
 */
export function logout() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  } catch (e) {
    console.warn('Error during logout:', e);
  }
}

/**
 * Get stored token
 * @returns {string|null} Access token
 */
export function getToken() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('access_token');
    }
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
  return null;
}

/**
 * Get stored user
 * @returns {Object|null} User object
 */
export function getStoredUser() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  } catch (e) {
    console.warn('localStorage not available:', e);
  }
  return null;
}

/**
 * Check if the current token is expired locally
 * @returns {boolean}
 */
export function isTokenExpired() {
  const token = getToken();
  if (!token) return true;
  try {
    // Basic JWT decoding
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      console.warn('[Auth] Invalid token format (no payload)');
      return true;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    // exp is in seconds, convert to ms
    if (!payload.exp) {
      console.warn('[Auth] Token has no exp claim');
      return true;
    }

    const now = Date.now();
    const expMs = payload.exp * 1000;
    const isExpired = expMs < now;

    if (isExpired) {
      console.warn(`[Auth] Token expired: Exp=${new Date(expMs).toISOString()}, Now=${new Date(now).toISOString()}`);
    }

    return isExpired;
  } catch (e) {
    console.error('[Auth] Error checking token expiration:', e);
    return true; // Assume expired if we can't parse it
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  // Also check if it's expired locally to avoid 401s
  if (isTokenExpired()) {
    console.warn('Token is expired locally, logging out...');
    logout(); // Clear the expired token
    return false;
  }

  return true;
}

/**
 * Get authorization header
 * @returns {Object} Headers object with Authorization
 */
export function getAuthHeaders() {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  // Only add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}



