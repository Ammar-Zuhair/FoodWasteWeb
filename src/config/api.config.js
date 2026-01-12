/**
 * إعدادات API
 */

// Detect if running in native app (Capacitor)
// Use Capacitor.isNativePlatform() for accurate detection
const isNative = typeof window !== 'undefined' && 
  window.Capacitor !== undefined && 
  typeof window.Capacitor.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform();

// قائمة IPs محتملة - يمكنك تعديلها حسب شبكتك
export const POSSIBLE_IPS = [
  "srv1265534.hstgr.cloud",
  '20.205.133.127',   // Current Wi-Fi IP (PRIMARY)
  '192.168.1.3',     // Previous IP (fallback)
  '192.168.1.100',   // Common home network
  '192.168.0.100',   // Common home network
  '192.168.176.1',   // Alternative
  '192.168.126.1',   // Alternative
  '192.168.245.1',   // Alternative
  '192.168.43.1',    // Hotspot from mobile
  '192.168.137.1',   // Hotspot from mobile (alternative)
  '10.0.2.2'         // Android Emulator
];

// Get API URL - use environment variable or detect automatically for native
function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (isNative) {
    // محاولة الحصول على IP من localStorage إذا كان موجوداً
    let savedIP = null;
    try {
      savedIP = localStorage.getItem('backend_ip');
    } catch (e) {
      // localStorage غير متاح
    }
    
    const defaultIP = savedIP || POSSIBLE_IPS[0];
    
    // Only show warning once, and only in development
    if (import.meta.env.DEV && !window.__API_WARNING_SHOWN) {
      console.info('ℹ️ Native app detected. Using default IP:', defaultIP);
      console.info('💡 To customize, create .env.local with: VITE_API_URL=http://YOUR_IP:8000');
      window.__API_WARNING_SHOWN = true;
    }
    
    return `http://${defaultIP}:8000`;
  }
  
  return 'http://srv1265534.hstgr.cloud:8000';
}

/**
 * اختبار الاتصال بـ IP معين
 * @param {string} ip - عنوان IP للاختبار
 * @returns {Promise<boolean>} true إذا كان الاتصال ناجحاً
 */
export async function testConnection(ip) {
  const url = `http://${ip}:8000/health/`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 ثواني
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * البحث عن IP صحيح من القائمة
 * @returns {Promise<string|null>} IP صحيح أو null
 */
export async function findWorkingIP() {
  // أولاً، جرب IP المحفوظ
  try {
    const savedIP = localStorage.getItem('backend_ip');
    if (savedIP && await testConnection(savedIP)) {
      return savedIP;
    }
  } catch (e) {
    // تجاهل الأخطاء
  }
  
  // جرب جميع IPs في القائمة
  for (const ip of POSSIBLE_IPS) {
    if (await testConnection(ip)) {
      // احفظ IP الناجح
      try {
        localStorage.setItem('backend_ip', ip);
      } catch (e) {
        // تجاهل الأخطاء
      }
      return ip;
    }
  }
  
  return null;
}

function getLlamaUrl() {
  if (import.meta.env.VITE_LLAMA_URL) {
    return import.meta.env.VITE_LLAMA_URL;
  }
  
  if (isNative) {
    const apiUrl = getApiBaseUrl();
    return apiUrl.replace(':8000', ':8001');
  }
  
  return 'http://srv1265534.hstgr.cloud:8001';
}

export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  llamaURL: getLlamaUrl(),
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Log configuration (only in development, and only once)
if (import.meta.env.DEV && !window.__API_CONFIG_LOGGED) {
  console.log('🔌 API Config:', {
    isNative,
    baseURL: API_CONFIG.baseURL,
    llamaURL: API_CONFIG.llamaURL,
  });
  window.__API_CONFIG_LOGGED = true;
}

/**
 * Available Models
 */
export const AVAILABLE_MODELS = {
  DEMAND_FORECASTING: 'demand_forecasting',
  PRODUCT_EXPIRY: 'product_expiry',
  FOOD_VALUE: 'food_value',
  SENSOR_ANOMALY: 'sensor_anomaly',
  SENSOR_FAIL: 'sensor_fail',
  FRIDGE_FAIL: 'fridge_fail',
  ENERGY_ANOMALY: 'energy_anomaly',
  RETURN_PRODUCT: 'return_product',
  VPS: 'vps',
  HIGH_DANGEROUS: 'high_dangerous',
};

/**
 * Model Display Names (Arabic)
 */
export const MODEL_NAMES = {
  [AVAILABLE_MODELS.DEMAND_FORECASTING]: 'توقع الطلب',
  [AVAILABLE_MODELS.PRODUCT_EXPIRY]: 'توقع انتهاء الصلاحية',
  [AVAILABLE_MODELS.FOOD_VALUE]: 'تقييم جودة الطعام',
  [AVAILABLE_MODELS.SENSOR_ANOMALY]: 'اكتشاف شذوذ الحساسات',
  [AVAILABLE_MODELS.SENSOR_FAIL]: 'توقع أعطال الحساسات',
  [AVAILABLE_MODELS.FRIDGE_FAIL]: 'توقع أعطال التبريد',
  [AVAILABLE_MODELS.ENERGY_ANOMALY]: 'اكتشاف شذوذ الطاقة',
  [AVAILABLE_MODELS.RETURN_PRODUCT]: 'توقع الإرجاعات',
  [AVAILABLE_MODELS.VPS]: 'تحليل VPS',
  [AVAILABLE_MODELS.HIGH_DANGEROUS]: 'تحديد المنتجات عالية الخطورة',
};









