import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/shared/Logo.jsx";
import { getMenuItems } from "../utils/permissions.js";
import { isNative, initStatusBar } from "../utils/capacitor.js";
import { useDevice } from "../hooks/useDevice.js";

// Icons mapping
const getIcon = (iconName) => {
  const icons = {
    home: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    track: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    shipments: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    default: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    ),
  };
  return icons[iconName] || icons.default;
};

function MobileLayout({ user, children, onLogout }) {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isTablet } = useDevice();

  const menuItems = getMenuItems(user.role);

  // Initialize StatusBar for mobile - CRITICAL for proper safe area handling
  useEffect(() => {
    if (isNative()) {
      // Initialize immediately and retry if needed
      const initializeStatusBar = async () => {
        await initStatusBar(theme);
        // Retry after a short delay to ensure it's applied
        setTimeout(async () => {
          await initStatusBar(theme);
        }, 100);
      };
      initializeStatusBar();
    }
  }, [theme]);

  const bgClass = theme === "dark"
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "bg-gradient-to-br from-[#E6F7FB] via-[#F0FAFC] to-[#E6F7FB]";
  const cardBgClass = theme === "dark"
    ? "bg-slate-900 backdrop-blur-xl border-white/10 shadow-2xl"
    : "bg-white backdrop-blur-xl border-slate-200/60 shadow-2xl";
  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
  const borderClass = theme === "dark" ? "border-white/10" : "border-slate-200/60";

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`min-h-dvh flex flex-col ${bgClass} relative overflow-hidden transition-colors duration-300`}
      style={{
        marginTop: '0',
        paddingTop: '0',
        top: '0'
      }}
    >
      {/* Background Effects - Subtle for mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 right-0 w-64 h-64 ${theme === "dark" ? "bg-emerald-500/3" : "bg-[#429EBD]/3"} rounded-full blur-3xl`} />
        <div className={`absolute bottom-0 left-0 w-56 h-56 ${theme === "dark" ? "bg-amber-500/3" : "bg-[#F7AD19]/3"} rounded-full blur-3xl`} />
      </div>

      {/* Header - Compact and Beautiful - يبدأ بعد شريط الحالة مباشرة */}
      <header
        className={`fixed left-0 right-0 z-20 border-b ${borderClass} flex items-center justify-between shadow-lg`}
        style={{
          top: 'env(safe-area-inset-top)',
          paddingLeft: `max(0.875rem, env(safe-area-inset-left))`,
          paddingRight: `max(0.875rem, env(safe-area-inset-right))`,
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          height: isTablet ? '3.5rem' : '3rem',
          minHeight: isTablet ? '3.5rem' : '3rem',
          backgroundColor: theme === "dark" ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)'
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Hamburger Menu Button - واضح ومتناسق */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`shrink-0 p-1.5 rounded-lg ${theme === "dark" ? "bg-slate-800/80 hover:bg-slate-700/80 text-white" : "bg-slate-100/90 hover:bg-slate-200/90 text-[#053F5C]"} transition-all duration-200 active:scale-95 shadow-sm`}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo and App Name - واضح ومتناسق */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="shrink-0 h-6">
              <Logo className="h-full w-auto" />
            </div>
            <div className="min-w-0 hidden xs:block">
              <div className={`text-xs font-semibold ${textColor} truncate`}>
                {t("appName") || "تقليل هدر الطعام"}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - User Icon and Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* User Icon - يظهر دائماً */}
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-slate-700/80 text-white" : "bg-slate-200/90 text-[#053F5C]"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          {/* Logout Button - أيقونة فقط على الموبايل */}
          <button
            onClick={onLogout}
            className={`shrink-0 p-1.5 rounded-lg ${theme === "dark" ? "bg-red-600/80 hover:bg-red-700/80 text-white" : "bg-red-500/90 hover:bg-red-600/90 text-white"} transition-all duration-200 active:scale-95 shadow-sm`}
            aria-label={t("logout") || "تسجيل الخروج"}
            title={t("logout") || "تسجيل الخروج"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hamburger Menu - Slide in from side */}
      {isMenuOpen && (
        <>
          {/* Overlay - يبدأ بعد شريط الحالة */}
          <div
            className={`fixed z-40 ${theme === "dark" ? "bg-black/70" : "bg-white/70"} backdrop-blur-sm transition-opacity duration-300`}
            onClick={() => setIsMenuOpen(false)}
            style={{
              top: 'env(safe-area-inset-top)',
              left: 0,
              right: 0,
              bottom: 0,
              paddingLeft: `max(0, env(safe-area-inset-left))`,
              paddingRight: `max(0, env(safe-area-inset-right))`,
              paddingBottom: `max(0, env(safe-area-inset-bottom))`
            }}
          />
          {/* Menu Panel - يبدأ بعد الـ Header مباشرة (بعد شريط الحالة + Header) */}
          <div
            className={`fixed ${language === "ar" ? "right-0" : "left-0"} bottom-0 w-80 ${cardBgClass} border-l ${borderClass} shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
            style={{
              top: `calc(env(safe-area-inset-top) + ${isTablet ? '3.5rem' : '3rem'})`,
              paddingTop: 0,
              paddingLeft: `max(0, env(safe-area-inset-left))`,
              paddingRight: `max(0, env(safe-area-inset-right))`,
              paddingBottom: `max(0, env(safe-area-inset-bottom))`,
              maxHeight: `calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${isTablet ? '3.5rem' : '3rem'})`,
              height: `calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${isTablet ? '3.5rem' : '3rem'})`
            }}
          >
            {/* Header Section - محسّن ومنسق مع احترام safe area - يبدأ بعد الـ Header الرئيسي */}
            <div
              className={`border-b ${borderClass} ${theme === "dark" ? "bg-slate-900/50" : "bg-slate-50/50"}`}
              style={{
                paddingTop: '1.25rem',
                paddingBottom: '0.875rem',
                paddingLeft: `max(1rem, env(safe-area-inset-left))`,
                paddingRight: `max(1rem, env(safe-area-inset-right))`,
                marginTop: 0,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: theme === "dark" ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-slate-800" : "bg-slate-200"}`}>
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] ${subTextColor} mb-0.5 uppercase tracking-wider font-medium`}>
                      {t("currentRole") || "الدور الحالي"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${theme === "dark" ? "bg-emerald-400" : "bg-[#429EBD]"} animate-pulse`} />
                      <span className={`text-sm font-bold ${textColor} truncate`}>{user.role}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className={`shrink-0 p-1.5 rounded-lg ${theme === "dark" ? "bg-slate-800/80 hover:bg-slate-700/80" : "bg-slate-200/80 hover:bg-slate-300/80"} transition-colors ${textColor}`}
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Items - محسّنة ومنسقة مع احترام safe area */}
            <nav
              className="px-2.5 py-3 space-y-1.5 overflow-y-auto"
              style={{
                maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 100px)',
                paddingLeft: `max(0.625rem, env(safe-area-inset-left))`,
                paddingRight: `max(0.625rem, env(safe-area-inset-right))`,
                paddingBottom: `max(0.75rem, env(safe-area-inset-bottom))`
              }}
            >
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(item.path);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-lg transition-all duration-200 ${isActive
                        ? `${theme === "dark" ? "bg-emerald-500/20 text-white shadow-sm" : "bg-[#429EBD]/20 text-[#053F5C] shadow-sm"} border ${theme === "dark" ? "border-emerald-500/40" : "border-[#429EBD]/40"}`
                        : `${subTextColor} ${theme === "dark" ? "hover:bg-slate-800/60 hover:text-white" : "hover:bg-slate-100/80 hover:text-[#053F5C]"}`
                      } active:scale-[0.98]`}
                  >
                    <span className={`shrink-0 ${isActive ? (theme === "dark" ? "text-emerald-400" : "text-[#429EBD]") : ""}`}>
                      {getIcon(item.icon)}
                    </span>
                    <span className={`font-medium text-sm flex-1 ${language === "ar" ? "text-right" : "text-left"} ${isActive ? textColor : ""}`}>
                      {t(item.label) || item.label}
                    </span>
                    {isActive && (
                      <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${theme === "dark" ? "bg-emerald-400" : "bg-[#429EBD]"} animate-pulse`} />
                    )}
                    {!isActive && (
                      <svg className="w-3.5 h-3.5 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={language === "ar" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                      </svg>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </>
      )}

      {/* Main Content - Optimized for mobile - يبدأ بعد Header الثابت */}
      <main
        className="flex-1 relative z-10 overflow-y-auto"
        style={{
          paddingLeft: `max(1rem, env(safe-area-inset-left))`,
          paddingRight: `max(1rem, env(safe-area-inset-right))`,
          paddingTop: `calc(${isTablet ? '3.5rem' : '3rem'} + env(safe-area-inset-top) + 1rem)`,
          paddingBottom: `max(${menuItems.length > 0 && menuItems.length <= 5 ? '4rem' : '1rem'}, env(safe-area-inset-bottom))`,
          marginTop: '0'
        }}
      >
        <div className="max-w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Beautiful and Functional */}
      {menuItems.length > 0 && menuItems.length <= 5 && (
        <nav className={`fixed bottom-0 left-0 right-0 ${cardBgClass} border-t ${borderClass} z-30 shadow-2xl`} style={{
          paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))`,
          paddingTop: '0.5rem',
          paddingLeft: `max(0.5rem, env(safe-area-inset-left))`,
          paddingRight: `max(0.5rem, env(safe-area-inset-right))`
        }}>
          <div className="flex items-center justify-around px-1">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all duration-200 min-w-[56px] flex-1 ${isActive
                      ? `${theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-[#429EBD]/15 text-[#429EBD]"}`
                      : `${subTextColor} ${theme === "dark" ? "hover:bg-slate-800/30" : "hover:bg-slate-50/50"}`
                    } active:scale-95`}
                >
                  <span className={`${isActive ? "scale-110" : ""} transition-transform duration-200`}>
                    {getIcon(item.icon)}
                  </span>
                  <span className={`text-[9px] font-semibold leading-tight ${isActive ? "opacity-100" : "opacity-70"}`}>
                    {t(item.label) || item.label}
                  </span>
                  {isActive && (
                    <span className={`h-0.5 w-6 rounded-full ${theme === "dark" ? "bg-emerald-400" : "bg-[#429EBD]"} mt-0.5`} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export default MobileLayout;
