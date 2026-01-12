/**
 * API Client للاتصال بالـ Backend
 */
import { getAuthHeaders, isAuthenticated } from './api/auth.js';

// Detect if running in native app (Capacitor)
// Use Capacitor.isNativePlatform() for accurate detection
const isNative = typeof window !== 'undefined' &&
  window.Capacitor !== undefined &&
  typeof window.Capacitor.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform();

// Get API URL - use environment variable or detect automatically for native
function getApiBaseUrl() {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // If running in native app, try to detect the correct IP
  if (isNative) {
    // Try multiple common IP addresses
    const possibleIPs = [
      '192.168.8.184',   // Most common
      '192.168.1.100',   // Common home network
      '192.168.0.100',   // Common home network
      '192.168.176.1',   // Alternative
      '192.168.126.1',   // Alternative
      '192.168.245.1',   // Alternative
      '10.0.2.2'         // Android Emulator
    ];

    // Use the first IP as default (most likely)
    const defaultIP = possibleIPs[0];

    // Only show warning once, and only in development
    if (import.meta.env.DEV && !window.__API_WARNING_SHOWN) {
      console.info('ℹ️ Native app detected. Using default IP:', defaultIP);
      console.info('💡 To customize, create .env.local with: VITE_API_URL=http://YOUR_IP:8000');
      window.__API_WARNING_SHOWN = true;
    }

    return `http://${defaultIP}:8000`;
  }

  // For web development, use the hosted server
  return 'http://srv1265534.hstgr.cloud:8000';
}

function getLlamaUrl() {
  if (import.meta.env.VITE_LLAMA_URL) {
    return import.meta.env.VITE_LLAMA_URL;
  }

  if (isNative) {
    const apiUrl = getApiBaseUrl();
    // Replace port 8000 with 8001 for LLaMA
    return apiUrl.replace(':8000', ':8001');
  }

  return 'http://srv1265534.hstgr.cloud:8001';
}

const API_BASE_URL = getApiBaseUrl();
const LLAMA_SERVICE_URL = getLlamaUrl();

// Log API configuration for debugging (only in development, and only once)
if (import.meta.env.DEV && !window.__API_CONFIG_LOGGED) {
  console.log('🔌 API Configuration:', {
    isNative,
    API_BASE_URL,
    LLAMA_SERVICE_URL,
    env: {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_LLAMA_URL: import.meta.env.VITE_LLAMA_URL,
    }
  });
  window.__API_CONFIG_LOGGED = true;
}

/**
 * Helper function للـ API calls
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear expired token
        const { logout } = await import('./api/auth.js');
        logout();

        // Create error with status code
        const error = await response.json().catch(() => ({ detail: 'Session expired. Please login again.' }));
        const authError = new Error(error.detail || 'Session expired. Please login again.');
        authError.status = 401;
        authError.isAuthError = true;
        throw authError;
      }

      const error = await response.json().catch(() => ({ detail: response.statusText }));
      const httpError = new Error(error.detail || `HTTP error! status: ${response.status}`);
      httpError.status = response.status;
      throw httpError;
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Health Check
 */
export async function checkHealth() {
  return apiRequest('/health/');
}

/**
 * Models API
 */
export const modelsAPI = {
  /**
   * الحصول على قائمة النماذج المتاحة
   */
  async list() {
    return apiRequest('/api/v1/models/list');
  },

  /**
   * الحصول على معلومات نموذج
   */
  async getInfo(modelName) {
    return apiRequest(`/api/v1/models/${modelName}/info`);
  },

  /**
   * استدعاء نموذج للتنبؤ
   */
  async predict(modelName, inputData) {
    return apiRequest('/api/v1/models/predict', {
      method: 'POST',
      body: JSON.stringify({
        model_name: modelName,
        input_data: inputData,
      }),
    });
  },
};

/**
 * LLaMA API
 */
export const llamaAPI = {
  /**
   * الحصول على حالة LLaMA Service
   */
  async getStatus() {
    return apiRequest('/api/v1/llama/status');
  },

  /**
   * توليد نص باستخدام LLaMA
   */
  async generate(prompt, options = {}) {
    return apiRequest('/api/v1/llama/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        max_tokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        language: options.language || 'ar',
      }),
    });
  },

  /**
   * محادثة متعددة الجولات
   */
  async chat(messages) {
    return apiRequest('/api/v1/llama/chat', {
      method: 'POST',
      body: JSON.stringify(messages),
    });
  },
};

/**
 * Dashboard API
 */
export const dashboardAPI = {
  /**
   * Overview stats
   */
  async overview() {
    // Check if user is authenticated before making request
    if (!isAuthenticated()) {
      const error = new Error('Authentication required. Please login first.');
      error.status = 401;
      throw error;
    }

    return apiRequest('/api/v1/dashboard/overview', {
      headers: getAuthHeaders(),
    });
  },

  /**
   * Generic section fetcher
   */
  async getSection(section) {
    if (!section) {
      throw new Error('Section is required');
    }

    // Check if user is authenticated before making request
    if (!isAuthenticated()) {
      const error = new Error('Authentication required. Please login first.');
      error.status = 401;
      throw error;
    }

    const response = await apiRequest(`/api/v1/dashboard/${section}`, {
      headers: getAuthHeaders(),
    });
    // Handle both formats: {section: "ai", data: {...}} and {data: {...}} or direct data
    if (response && response.data) {
      return response.data;
    }
    return response;
  },
};

/**
 * Helper functions للاستخدام الشائع
 */
export const apiHelpers = {
  /**
   * تحويل بيانات food_value إلى تنسيق مناسب للعرض
   */
  formatFoodValuePrediction(prediction) {
    if (!prediction || !prediction.prediction) {
      return null;
    }

    const data = prediction.prediction;
    return {
      qualityScore: data.quality_score || 0,
      action: data.action || 'Unknown',
      safetyStatus: data.safety_status || 'Unknown',
      actionProbabilities: data.action_probabilities || {},
      inferenceTime: prediction.inference_time_ms || 0,
    };
  },

  /**
   * تحويل بيانات LLaMA إلى تنسيق مناسب
   */
  formatLLaMAResponse(response) {
    return {
      text: response.response || '',
      tokensGenerated: response.tokens_generated || 0,
      model: response.model || 'llama-7b',
      generationTime: response.generation_time_ms || 0,
    };
  },
};

export default {
  checkHealth,
  modelsAPI,
  llamaAPI,
  dashboardAPI,
  apiHelpers,
};


