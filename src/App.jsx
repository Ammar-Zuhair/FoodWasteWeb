import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { LanguageProvider } from "./contexts/LanguageContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { getStoredUser, isAuthenticated, logout as authLogout } from "./utils/api/auth.js";
import { hasPermission, canView } from "./utils/permissions.js";
import { useDevice } from "./hooks/useDevice.js";
import { isNative as isNativePlatform, initStatusBar } from "./utils/capacitor.js";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage.jsx";
import RoleBasedLayout from "./layouts/RoleBasedLayout.jsx";
import MainDashboard from "./pages/MainDashboard.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import SplashScreen from "./components/shared/SplashScreen.jsx";
import DriverDashboard from "./pages/driver/DriverDashboard.jsx";
import RefrigerationManagement from "./pages/RefrigerationManagement.jsx";
import AIDashboard from "./pages/AIDashboard.jsx";
import DigitalTwin from "./pages/DigitalTwin.jsx";
import ProductionPlanning from "./pages/ProductionPlanning.jsx";
import WasteAnalysis from "./pages/WasteAnalysis.jsx";
import ReturnsManagement from "./pages/ReturnsManagement.jsx";
import CharityIntegration from "./pages/CharityIntegration.jsx";
import AlertCenter from "./pages/AlertCenter.jsx";
import Reports from "./pages/Reports.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import ShipmentManagement from "./pages/ShipmentManagement.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import AdapterManagement from "./pages/AdapterManagement.jsx";
import QualityManagement from "./pages/QualityManagement.jsx";
import OrderManagement from "./pages/OrderManagement.jsx";
import BranchesManagement from "./pages/BranchesManagement.jsx";
import FacilitiesManagement from "./pages/FacilitiesManagement.jsx";
import VehiclesManagement from "./pages/VehiclesManagement.jsx";
import SupermarketsManagement from "./pages/SupermarketsManagement.jsx";
import AlertSettings from "./pages/AlertSettings.jsx";
import SystemSettings from "./pages/SystemSettings.jsx";
import BatchManagement from "./pages/BatchManagement.jsx";
import ProductionManagement from "./pages/ProductionManagement.jsx";
import DistributionManagement from "./pages/DistributionManagement.jsx";
import TaskManagement from "./pages/TaskManagement.jsx";
import LeadManagement from "./pages/LeadManagement.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import HeatMaps from "./pages/HeatMaps.jsx";
import RFIDTracking from "./pages/RFIDTracking.jsx";
import Profile from "./pages/Profile.jsx";
import InventoryManagement from "./pages/InventoryManagement.jsx";
import ForbiddenPage from "./pages/ForbiddenPage.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [pageTransition, setPageTransition] = useState(false);
  const { isMobile, isNative: isNativeDevice } = useDevice();

  // Initialize StatusBar immediately on app start (CRITICAL for removing black space)
  useEffect(() => {
    if (isNativePlatform()) {
      // Initialize status bar immediately with dark theme (default)
      initStatusBar('dark').catch(err => {
        console.warn('Failed to initialize status bar:', err);
      });
    }
  }, []);

  // Set page title dynamically
  useEffect(() => {
    document.title = "منصة تقليل الهدر الغذائي - HSA Group";
  }, []);

  const handleLogout = useCallback(() => {
    // Close all WebSocket connections before logout
    try {
      // Close all active WebSocket connections
      if (typeof window !== 'undefined' && window.WebSocket) {
        // This will be handled by component cleanup, but we ensure it here too
        console.log('Logging out - closing WebSocket connections...');
      }
    } catch (err) {
      console.warn('Error closing WebSocket connections:', err);
    }

    authLogout();
    setUser(null);
    setShowLanding(true); // Show landing page after logout

    // Force navigation to landing page
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }, 100);
  }, []);

  // Check for stored user on mount and set loading to false
  useEffect(() => {
    // Always show landing page first on web (even if user is logged in)
    // On native app, skip landing page
    if (isNativeDevice) {
      setShowLanding(false);
    } else {
      // On web, always show landing page first
      setShowLanding(true);
    }

    // Load user data if authenticated (but still show landing page first)
    if (isAuthenticated()) {
      const storedUser = getStoredUser();
      if (storedUser) {
        // Map role to display format - keep original role names
        // Include all user fields for personalized interface
        setUser({
          id: storedUser.id,
          name: storedUser.full_name || storedUser.name,
          role: storedUser.role, // Keep original role
          email: storedUser.email,
          organization_id: storedUser.organization_id,
          organizationId: storedUser.organization_id, // Keep for backward compatibility
          account_type: storedUser.account_type,
          department: storedUser.department,
          job_title: storedUser.job_title,
          is_distributor: storedUser.is_distributor,
          branch_id: storedUser.branch_id,
          branch_name: storedUser.branch_name,
          facility_id: storedUser.facility_id,
          facility_name: storedUser.facility_name,
          supermarket_name: storedUser.supermarket_name, // اسم السوبر ماركت
        });
        // Keep landing page visible - user can navigate from there
      }
    }

    // Always set loading to false after checking authentication
    setLoading(false);

    // Initialize page transition after splash (if splash was skipped)
    if (!showSplash) {
      setTimeout(() => {
        setPageTransition(true);
      }, 100);
    }
  }, [isNativeDevice, showSplash]);

  // Listen for authentication expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      console.log('Authentication expired - logging out...');
      handleLogout();
    };

    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [handleLogout]); // Include handleLogout in dependencies

  // Show splash screen first
  if (showSplash) {
    return (
      <LanguageProvider>
        <ThemeProvider>
          <SplashScreen
            onComplete={() => {
              setShowSplash(false);
              // Start page transition animation
              setTimeout(() => {
                setPageTransition(true);
              }, 50);
            }}
          />
        </ThemeProvider>
      </LanguageProvider>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Check if native app (APK) - only skip landing page on native, not on web
  // على الويب: تظهر Landing Page أولاً
  // على الموبايل (APK): تظهر Login Page مباشرة
  const isNativeApp = isNativeDevice;

  try {
    return (
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Toaster position="top-center" reverseOrder={false} />
            <div
              className={`transition-all duration-700 ease-out ${pageTransition ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              style={{ width: "100%" }}
            >
              <BrowserRouter>
                <Routes>
                  {/* 403 Forbidden Page - Standalone, no layout */}
                  <Route path="/403" element={<ForbiddenPage />} />

                  <Route
                    path="/"
                    element={
                      // Skip landing page only on native app (APK), go directly to login
                      // On web (even if mobile browser), show landing page first
                      // النظام موحد: أي مستخدم يمكنه الدخول من الويب أو الموبايل
                      isNativeApp ? (
                        !user ? (
                          <LoginPage onLogin={setUser} />
                        ) : (
                          <Navigate to="/dashboard" replace />
                        )
                      ) : showLanding ? (
                        <LandingPage
                          onEnter={() => {
                            setShowLanding(false);
                            setShowLogin(true);
                          }}
                          onVisitDashboard={() => {
                            if (isAuthenticated()) {
                              const storedUser = getStoredUser();
                              if (storedUser) {
                                setUser({
                                  id: storedUser.id,
                                  name: storedUser.full_name || storedUser.name,
                                  role: storedUser.role,
                                  email: storedUser.email,
                                  organizationId: storedUser.organization_id,
                                });
                                setShowLanding(false);
                                setShowLogin(false);
                              } else {
                                setShowLanding(false);
                                setShowLogin(true);
                              }
                            } else {
                              setShowLanding(false);
                              setShowLogin(true);
                            }
                          }}
                        />
                      ) : showLogin ? (
                        <LoginPage
                          onLogin={(userData) => {
                            setUser(userData);
                            setShowLogin(false);
                          }}
                          onBack={() => {
                            setShowLogin(false);
                            setShowLanding(true);
                          }}
                        />
                      ) : !user ? (
                        <LoginPage
                          onLogin={setUser}
                          onBack={() => {
                            setShowLanding(true);
                            setShowLogin(false);
                          }}
                        />
                      ) : (
                        <Navigate to="/dashboard" replace />
                      )
                    }
                  />
                  {/* Protected Routes - Always render, but check permissions inside */}
                  <Route
                    path="/dashboard"
                    element={
                      (() => {
                        // Check if user is authenticated from localStorage (for immediate access)
                        const storedUser = isAuthenticated() ? getStoredUser() : null;
                        const currentUser = user || (storedUser ? {
                          id: storedUser.id,
                          name: storedUser.full_name || storedUser.name,
                          role: storedUser.role,
                          email: storedUser.email,
                          organizationId: storedUser.organization_id,
                        } : null);

                        if (!currentUser) {
                          return <Navigate to="/" replace />;
                        }

                        if (!hasPermission(currentUser.role, "/dashboard")) {
                          return <Navigate to="/" replace />;
                        }

                        return (
                          <RoleBasedLayout user={currentUser} onLogout={handleLogout}>
                            <MainDashboard user={currentUser} />
                          </RoleBasedLayout>
                        );
                      })()
                    }
                  />
                  {user && (
                    <>
                      {/* Protected Routes with Role-Based Layout */}
                      <Route
                        path="/refrigeration"
                        element={
                          hasPermission(user.role, "/refrigeration", user) ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <RefrigerationManagement />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/ai"
                        element={
                          hasPermission(user.role, "/ai") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <AIDashboard />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/digital-twin"
                        element={
                          hasPermission(user.role, "/digital-twin") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <DigitalTwin />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/production"
                        element={
                          hasPermission(user.role, "/production") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <ProductionPlanning user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/production/management"
                        element={
                          hasPermission(user.role, "/production") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <ProductionManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/batches"
                        element={
                          hasPermission(user.role, "/batches") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <BatchManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/tasks"
                        element={
                          hasPermission(user.role, "/tasks") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <TaskManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/leads"
                        element={
                          hasPermission(user.role, "/leads") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <LeadManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/chatbot"
                        element={
                          hasPermission(user.role, "/chatbot") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <Chatbot user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/heatmaps"
                        element={
                          hasPermission(user.role, "/heatmaps") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <HeatMaps />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/rfid-tracking"
                        element={
                          hasPermission(user.role, "/rfid-tracking") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <RFIDTracking />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/distribution"
                        element={
                          hasPermission(user.role, "/distribution") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <DistributionManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/waste-analysis"
                        element={
                          hasPermission(user.role, "/waste-analysis") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <WasteAnalysis user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/shipments"
                        element={
                          hasPermission(user.role, "/shipments") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <ShipmentManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/shipments/track"
                        element={
                          hasPermission(user.role, "/shipments/track") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <DriverDashboard />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/returns"
                        element={
                          hasPermission(user.role, "/returns") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <ReturnsManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/charity"
                        element={
                          hasPermission(user.role, "/charity") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <CharityIntegration user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/alerts"
                        element={
                          hasPermission(user.role, "/alerts") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <AlertCenter user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/reports"
                        element={
                          hasPermission(user.role, "/reports") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <Reports />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/audit-logs"
                        element={
                          hasPermission(user.role, "/audit-logs") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <AuditLogs />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/adapters"
                        element={
                          hasPermission(user.role, "/adapters") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <AdapterManagement />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      {hasPermission(user.role, "/admin") && (
                        <>
                          <Route
                            path="/admin"
                            element={
                              <RoleBasedLayout user={user} onLogout={handleLogout}>
                                <UserManagement user={user} />
                              </RoleBasedLayout>
                            }
                          />
                          <Route
                            path="/admin/branches"
                            element={
                              <RoleBasedLayout user={user} onLogout={handleLogout}>
                                <BranchesManagement />
                              </RoleBasedLayout>
                            }
                          />
                          <Route
                            path="/admin/facilities"
                            element={
                              <RoleBasedLayout user={user} onLogout={handleLogout}>
                                <FacilitiesManagement />
                              </RoleBasedLayout>
                            }
                          />
                          <Route
                            path="/admin/vehicles"
                            element={
                              <RoleBasedLayout user={user} onLogout={handleLogout}>
                                <VehiclesManagement />
                              </RoleBasedLayout>
                            }
                          />
                          <Route
                            path="/admin/supermarkets"
                            element={
                              <RoleBasedLayout user={user} onLogout={handleLogout}>
                                <SupermarketsManagement />
                              </RoleBasedLayout>
                            }
                          />
                          <Route
                            path="/admin/alert-settings"
                            element={
                              <RoleBasedLayout user={user} onLogout={handleLogout}>
                                <AlertSettings />
                              </RoleBasedLayout>
                            }
                          />
                          <Route
                            path="/admin/system-settings"
                            element={
                              <RoleBasedLayout user={user} onLogout={handleLogout}>
                                <SystemSettings />
                              </RoleBasedLayout>
                            }
                          />
                        </>
                      )}
                      <Route
                        path="/quality"
                        element={
                          hasPermission(user.role, "/quality") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <QualityManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/orders"
                        element={
                          hasPermission(user.role, "/orders") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <OrderManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/charity"
                        element={
                          hasPermission(user.role, "/charity") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <CharityIntegration user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      <Route
                        path="/inventory"
                        element={
                          hasPermission(user.role, "/inventory") ? (
                            <RoleBasedLayout user={user} onLogout={handleLogout}>
                              <InventoryManagement user={user} />
                            </RoleBasedLayout>
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />
                      {/* Profile - accessible by all authenticated users */}
                      <Route
                        path="/profile"
                        element={
                          <RoleBasedLayout user={user} onLogout={handleLogout}>
                            <Profile />
                          </RoleBasedLayout>
                        }
                      />
                      {/* System Settings shortcut */}
                      <Route
                        path="/settings/system"
                        element={
                          <RoleBasedLayout user={user} onLogout={handleLogout}>
                            <SystemSettings />
                          </RoleBasedLayout>
                        }
                      />
                      {/* Admin route redirect */}
                      <Route
                        path="/admin"
                        element={<Navigate to="/dashboard" replace />}
                      />
                      <Route
                        path="/admin/*"
                        element={<Navigate to="/dashboard" replace />}
                      />
                    </>
                  )}
                </Routes>
              </BrowserRouter>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    );
  } catch (error) {
    console.error('App Error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4" dir="rtl">
        <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-bold mb-2">حدث خطأ في التطبيق</h2>
          <p className="text-slate-400 text-sm mb-4">
            {error?.message || 'حدث خطأ غير متوقع'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors"
          >
            إعادة تحميل
          </button>
        </div>
      </div>
    );
  }
}

export default App;
