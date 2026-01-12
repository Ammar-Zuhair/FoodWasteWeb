/**
 * API Interceptor - Request/Response Handling with Permissions
 * 
 * Features:
 * - Automatically adds scope params (facility_id, etc.) from JWT
 * - Proper error handling (redirect to 403/login)
 * - Resource mapping for permission checks
 * - Audit logging for denied requests
 * 
 * SECURITY NOTE:
 * - Backend is the source of truth for permissions
 * - This interceptor provides UX convenience only
 * - All permissions MUST be enforced server-side
 */

import { getStoredUser, getToken, logout } from '../utils/api/auth.js';
import { buildScopeParams, canView, RESOURCES } from '../utils/permissions.js';
import { logAPIAccess } from '../services/auditService.js';

// Endpoint to Resource mapping (stable, not URL parsing)
const ENDPOINT_RESOURCE_MAP = {
    '/api/v1/orders': RESOURCES.ORDERS,
    '/api/v1/batches': RESOURCES.BATCHES,
    '/api/v1/inventory': RESOURCES.INVENTORY,
    '/api/v1/allocations': RESOURCES.INVENTORY,
    '/api/v1/production': RESOURCES.PRODUCTION,
    '/api/v1/shipments': RESOURCES.SHIPMENTS,
    '/api/v1/quality': RESOURCES.QUALITY,
    '/api/v1/waste': RESOURCES.WASTE_ANALYSIS,
    '/api/v1/alerts': RESOURCES.ALERTS,
    '/api/v1/reports': RESOURCES.REPORTS,
    '/api/v1/users': RESOURCES.USERS,
    '/api/v1/facilities': RESOURCES.FACILITIES,
    '/api/v1/branches': RESOURCES.BRANCHES,
    '/api/v1/vehicles': RESOURCES.VEHICLES,
    '/api/v1/merchants': RESOURCES.SUPERMARKETS,
    '/api/v1/distribution': RESOURCES.DISTRIBUTION,
    '/api/v1/refrigeration': RESOURCES.REFRIGERATION,
    '/api/v1/tasks': RESOURCES.TASKS,
    '/api/v1/leads': RESOURCES.LEADS,
    '/api/v1/returns': RESOURCES.RETURNS,
    '/api/v1/charity': RESOURCES.CHARITY,
    '/api/v1/monitoring': RESOURCES.REFRIGERATION,
    '/api/v1/sensors': RESOURCES.REFRIGERATION,
    '/api/v1/dashboard': RESOURCES.DASHBOARD,
    '/api/v1/ai': RESOURCES.AI_DASHBOARD,
    '/api/v1/chatbot': RESOURCES.CHATBOT,
};

/**
 * Extract resource from URL using stable mapping
 * @param {string} url - API URL
 * @returns {string|null} Resource name or null
 */
export function extractResourceFromUrl(url) {
    if (!url) return null;

    // Find matching endpoint
    for (const [endpoint, resource] of Object.entries(ENDPOINT_RESOURCE_MAP)) {
        if (url.includes(endpoint)) {
            return resource;
        }
    }

    return null;
}

/**
 * Setup axios interceptors for permission handling
 * @param {Object} axiosInstance - Axios instance to configure
 */
export function setupApiInterceptors(axiosInstance) {
    // Request interceptor
    axiosInstance.interceptors.request.use(
        (config) => {
            // Get user from JWT/storage
            const user = getStoredUser();
            const token = getToken();

            // Add auth header
            if (token) {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            // Add scope params (facility_id, etc.) from user's JWT claims
            if (user) {
                const scopeParams = buildScopeParams(user);
                config.params = { ...config.params, ...scopeParams };
            }

            // Store resource in config for response interceptor
            config._resource = config.meta?.resource || extractResourceFromUrl(config.url);
            config._user = user;

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor for error handling
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            const { config, response } = error;
            const user = config?._user;
            const resource = config?._resource;

            // Handle 401 - Unauthorized (token expired or invalid)
            if (response?.status === 401) {
                console.warn('[API] Token expired or invalid - logging out');
                logout();

                // Redirect to login
                if (typeof window !== 'undefined') {
                    window.location.href = '/';
                }
                return Promise.reject(error);
            }

            // Handle 403 - Forbidden (no permission)
            if (response?.status === 403) {
                // Log the attempt
                const method = config?.method?.toUpperCase() || 'GET';
                logAPIAccess(user, config?.url, method, false);

                console.warn('[API] Access forbidden:', config?.url);

                // Redirect to 403 page
                if (typeof window !== 'undefined') {
                    window.location.href = '/403';
                }
                return Promise.reject(error);
            }

            return Promise.reject(error);
        }
    );
}

/**
 * Check if user can access endpoint before making request
 * This is a UX convenience - Backend MUST still verify
 * @param {string} url - API URL
 * @param {Object} user - User object
 * @returns {boolean} Whether access should be attempted
 */
export function canAccessEndpoint(url, user) {
    if (!user) return false;

    const resource = extractResourceFromUrl(url);
    if (!resource) return true; // Unknown endpoints pass through

    return canView(user.role, resource);
}

/**
 * Create API request with automatic scope injection
 * Alternative to interceptor for manual control
 */
export function createScopedRequest(baseRequest) {
    return async (url, options = {}) => {
        const user = getStoredUser();
        const scopeParams = user ? buildScopeParams(user) : {};

        // Merge scope params
        const mergedParams = { ...options.params, ...scopeParams };

        return baseRequest(url, {
            ...options,
            params: mergedParams,
        });
    };
}

export default {
    setupApiInterceptors,
    extractResourceFromUrl,
    canAccessEndpoint,
    createScopedRequest,
    ENDPOINT_RESOURCE_MAP,
};
