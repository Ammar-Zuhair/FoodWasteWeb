/**
 * Audit Service - Security Logging
 * 
 * Logs unauthorized access attempts with severity levels.
 * Includes rate limiting to prevent DoS.
 * 
 * Severity Levels:
 * - LOW: Route access attempts
 * - MEDIUM: API read attempts
 * - HIGH: API write attempts (create/update/delete)
 */

import { getToken } from '../utils/api/auth.js';
import { API_CONFIG } from '../config/api.config.js';

// Severity constants
export const AUDIT_SEVERITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
};

// Rate limiting
let lastLogTime = 0;
const MIN_LOG_INTERVAL = 1000; // 1 second minimum between logs
const logBuffer = [];
const MAX_BUFFER_SIZE = 10;

/**
 * Log unauthorized access attempt
 * @param {Object} user - User object
 * @param {string} resource - Resource or URL attempted
 * @param {string} severity - LOW | MEDIUM | HIGH
 * @param {Object} details - Additional details
 */
export function logUnauthorizedAccess(user, resource, severity = AUDIT_SEVERITY.LOW, details = {}) {
    const now = Date.now();

    // Rate limiting check
    if (now - lastLogTime < MIN_LOG_INTERVAL) {
        // Buffer the log for batch processing
        if (logBuffer.length < MAX_BUFFER_SIZE) {
            logBuffer.push({ user, resource, severity, details, timestamp: now });
        }
        return;
    }

    lastLogTime = now;

    const logEntry = {
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        username: user?.username || null,
        user_role: user?.role || null,
        attempted_resource: resource,
        action: 'UNAUTHORIZED_ACCESS',
        severity,
        details: {
            ...details,
            user_facility_id: user?.facility_id,
            user_branch_id: user?.branch_id,
        },
        // Browser info (Backend will add IP and full User-Agent)
        client_info: {
            pathname: typeof window !== 'undefined' ? window.location.pathname : null,
            user_agent_partial: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : null,
        },
    };

    // Console log for development
    console.warn(`[AUDIT/${severity}] Unauthorized access attempt:`, logEntry);

    // Send to backend (fire and forget)
    sendAuditLog(logEntry);

    // Process buffered logs
    if (logBuffer.length > 0) {
        const bufferedLogs = [...logBuffer];
        logBuffer.length = 0;
        bufferedLogs.forEach(buffered => {
            sendAuditLog({
                ...buffered,
                timestamp: new Date(buffered.timestamp).toISOString(),
                action: 'UNAUTHORIZED_ACCESS',
            });
        });
    }
}

/**
 * Send audit log to backend
 * @param {Object} logEntry - Log entry to send
 */
async function sendAuditLog(logEntry) {
    try {
        const token = getToken();

        // Only send if we have a token (authenticated user)
        if (!token) {
            console.debug('[AUDIT] Skipping server log - no token');
            return;
        }

        const response = await fetch(`${API_CONFIG.baseURL}/api/v1/audit/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(logEntry),
        });

        if (!response.ok) {
            console.debug('[AUDIT] Failed to send log to server:', response.status);
        }
    } catch (error) {
        // Fail silently - audit logging should not break the app
        console.debug('[AUDIT] Error sending log:', error.message);
    }
}

/**
 * Log successful permission check (for analytics)
 */
export function logPermissionCheck(user, resource, action, allowed) {
    // Only log denied actions
    if (!allowed) {
        logUnauthorizedAccess(user, resource, AUDIT_SEVERITY.LOW, {
            action,
            type: 'PERMISSION_CHECK_FAILED',
        });
    }
}

/**
 * Log API access attempt
 */
export function logAPIAccess(user, url, method, allowed) {
    if (!allowed) {
        // Determine severity based on method
        let severity = AUDIT_SEVERITY.MEDIUM;
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
            severity = AUDIT_SEVERITY.HIGH;
        }

        logUnauthorizedAccess(user, url, severity, {
            method,
            type: 'API_ACCESS_DENIED',
        });
    }
}

export default {
    logUnauthorizedAccess,
    logPermissionCheck,
    logAPIAccess,
    AUDIT_SEVERITY,
};
