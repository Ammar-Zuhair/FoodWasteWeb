import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import Header from "../components/shared/Header.jsx";
import Sidebar from "../components/shared/Sidebar.jsx";

function MainLayout({ user, children, onLogout }) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    // Create a container for fixed elements
    let container = document.getElementById('fixed-elements-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fixed-elements-portal';
      container.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 9999;';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      // Cleanup - but keep container for other routes
      // container.remove();
    };
  }, []);

  const bgClass = theme === "dark"
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "bg-gradient-to-br from-[#E6F7FB] via-[#F0FAFC] to-[#E6F7FB]";
  const glowColor = theme === "dark"
    ? "bg-emerald-500/5"
    : "bg-[#429EBD]/8";
  const glowColor2 = theme === "dark"
    ? "bg-amber-500/5"
    : "bg-[#F7AD19]/8";

  return (
    <>
      {/* Sidebar and Header rendered via portal directly to body */}
      {portalContainer && createPortal(
        <div style={{ pointerEvents: 'auto' }}>
          <Sidebar role={user.role} user={user} />
          <Header user={user} onLogout={onLogout} />
        </div>,
        portalContainer
      )}

      {/* Main container with padding to account for fixed sidebar and header */}
      <div
        dir={language === "ar" ? "rtl" : "ltr"}
        className={`min-h-[100dvh] w-full ${bgClass} transition-colors duration-300 overflow-x-hidden`}
        style={{
          paddingLeft: language === "ar" ? 0 : "16rem",
          paddingRight: language === "ar" ? "16rem" : 0,
          paddingTop: "4rem",
          position: "relative"
        }}
      >
        {/* خلفية متحركة */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div className={`absolute top-0 right-0 w-96 h-96 ${glowColor} rounded-full blur-3xl animate-float`} />
          <div className={`absolute bottom-0 left-0 w-80 h-80 ${glowColor2} rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]`} />
        </div>

        <main className="relative px-6 pt-6 pb-6" style={{ zIndex: 10 }}>
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </>
  );
}

export default MainLayout;
