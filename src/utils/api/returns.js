/**
 * Returns API Service
 */
import { API_CONFIG } from '../../config/api.config.js';
import { getAuthHeaders } from './auth.js';

const BASE_URL = `${API_CONFIG.baseURL}/api/v1/returns`;

/**
 * Get returns list
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>}
 */
export async function getReturns(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.facility_id) params.append('facility_id', filters.facility_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.reason) params.append('reason', filters.reason);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const url = `${BASE_URL}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Handle 401/403 specifically if needed
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching returns:', error);
    throw error;
  }
}

/**
 * Create a return
 * @param {Object} returnData - Return data
 * @returns {Promise<Object>}
 */
export async function createReturn(returnData) {
  try {
    const response = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(returnData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating return:', error);
    throw error;
  }
}

/**
 * Update return status
 * @param {number|string} id - Return ID
 * @param {string} status - New status code
 * @param {string} [notes] - Optional notes
 * @returns {Promise<Object>}
 */
export async function updateReturnStatus(id, status, notes) {
  try {
    const response = await fetch(`${BASE_URL}/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating return status:', error);
    throw error;
  }
}

/**
 * Get returns AI recommendations
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getReturnsRecommendations(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.force_refresh) params.append('force_refresh', 'true');

    const url = `${BASE_URL}/recommendations${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
}

/**
 * Get returns dashboard stats and KPIs
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getReturnsDashboardStats(periodDays = 30) {
  try {
    const params = new URLSearchParams();
    params.append('period_days', periodDays);

    const url = `${BASE_URL}/dashboard/stats?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching returns dashboard stats:', error);
    throw error;
  }
}

/**
 * Update return item outcome (Restock, Donate, etc.)
 * @param {number|string} itemId - Return Item ID
 * @param {string} outcome - Outcome code (RESTOCK, DONATE, etc.)
 * @param {string} [notes] - Optional notes
 * @returns {Promise<Object>}
 */
export async function updateReturnItemOutcome(itemId, outcome, notes) {
  try {
    const response = await fetch(`${BASE_URL}/items/${itemId}/outcome`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ outcome, notes }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating return item outcome:', error);
    throw error;
  }
}

/**
 * Get returns analysis (Stats) - Deprecated
 * @param {Object} filters
 */
export async function getReturnsAnalysis(filters = {}) {
  return { summary: {}, trends: [] };
}
