import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Register Service Worker for PWA (only in production, not in development or native)
const isNativeAppForSW = typeof window !== 'undefined' &&
  window.Capacitor !== undefined &&
  typeof window.Capacitor.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform();

// Only register service worker in production build, not in development (Vite dev server)
const isDevelopment = import.meta.env.DEV;

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !isNativeAppForSW && !isDevelopment) {
  // Unregister any existing service workers in development
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else if (isDevelopment && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Unregister service workers in development to avoid conflicts with Vite
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('Service Worker unregistered for development');
      });
    }
  });

  // Also clear all caches in development to prevent net::ERR_CACHE_READ_FAILURE
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (let name of names) {
        caches.delete(name).then(() => {
          console.log(`Cache cleared for development: ${name}`);
        });
      }
    });
  }
}

// --- FETCH INTERCEPTOR START ---
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, config] = args;
  const urlStr = typeof url === 'string' ? url : url?.url || '';

  // If it's an API request (excluding health checks and login), check for local expiration
  if (urlStr && urlStr.includes('/api/v1/') &&
    !urlStr.includes('/auth/login') &&
    !urlStr.includes('/health')) {

    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));

          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.warn('Global Interceptor: Token expired locally. Blocking request to:', urlStr);
            // Dispatch event for App.jsx to handle logout
            setTimeout(() => window.dispatchEvent(new CustomEvent('auth:expired')), 0);

            // Return a mocked 401 response to avoid the network call
            return new Response(JSON.stringify({ detail: "Signature has expired" }), {
              status: 401,
              statusText: "Unauthorized",
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (e) {
        // If we can't parse it, let the request proceed and be handled by the backend
      }
    }
  }

  try {
    const response = await originalFetch(...args);
    if (response.status === 401 && urlStr.includes('/api/v1/') && !urlStr.includes('/auth/login')) {
      console.warn('Global Fetch Interceptor: 401 Unauthorized detected from server for:', urlStr);
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return response;
  } catch (error) {
    throw error;
  }
};
// --- FETCH INTERCEPTOR END ---

// Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">Error: Root element not found</div>';
  throw new Error('Root element not found');
}

// Log environment info
const isNativeApp = typeof window !== 'undefined' &&
  window.Capacitor !== undefined &&
  typeof window.Capacitor.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform();

console.log('App starting...', {
  isNative: isNativeApp,
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  localStorage: typeof window !== 'undefined' && typeof window.localStorage !== 'undefined',
});

try {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; color: white; background: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
      <h1 style="color: red; margin-bottom: 20px;">خطأ في تحميل التطبيق</h1>
      <p style="margin-bottom: 20px;">${error.message}</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer;">
        إعادة تحميل
      </button>
    </div>
  `;
}
