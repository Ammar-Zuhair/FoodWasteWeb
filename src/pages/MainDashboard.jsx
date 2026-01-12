import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import CommonAlerts from "../components/dashboard/CommonAlerts.jsx";
import AdminCards from "../components/dashboard/AdminCards.jsx";
import ImportantDataCards from "../components/dashboard/ImportantDataCards.jsx";

function MainDashboard({ user }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { theme } = useTheme();
  const { language, t } = useLanguage();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";

  return (
    <div className={`space-y-4 sm:space-y-5 md:space-y-6 ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-500`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* عنوان الصفحة */}
      <div className="mb-4 sm:mb-5 md:mb-8 animate-slide-in">
        <h2 className={`text-xl sm:text-2xl md:text-4xl font-semibold ${textColor} mb-1 sm:mb-1.5 md:mb-3 leading-tight tracking-tight`}>
          {t("mainDashboard")}
        </h2>
        <p className={`text-xs sm:text-sm md:text-lg ${subTextColor} leading-relaxed font-normal`}>
          {t("dashboardOverview")}
        </p>
      </div>

      {/* التنبيهات */}
      <CommonAlerts />

      {/* كروت الإدارة (للمدير فقط - ليس للمستخدمين من نوع supermarket) */}
      {user.role === "admin" && user.account_type !== "supermarket" && (
        <div className="animate-slide-in mt-4 sm:mt-5 md:mt-8" style={{ animationDelay: "0.3s" }}>
          <h3 className={`text-base sm:text-lg md:text-2xl font-semibold ${textColor} mb-3 sm:mb-4 md:mb-5 leading-tight`}>
            {t("systemOverview")}
          </h3>
          <AdminCards />
        </div>
      )}

      {/* البيانات المهمة */}
      <div className="animate-slide-in mt-6 sm:mt-8 md:mt-10" style={{ animationDelay: "0.5s" }}>
        <h3 className={`text-base sm:text-lg md:text-2xl font-semibold ${textColor} mb-4 sm:mb-5 md:mb-6 leading-tight`}>
          {language === "ar" ? "البيانات المهمة" : "Important Data"}
        </h3>
        <ImportantDataCards user={user} />
      </div>

      {/* واجهة مخصصة للمستخدمين من نوع supermarket */}
      {user.account_type === "supermarket" && (
        <div className="animate-slide-in mt-4 sm:mt-5 md:mt-8" style={{ animationDelay: "0.3s" }}>
          <h3 className={`text-base sm:text-lg md:text-2xl font-semibold ${textColor} mb-3 sm:mb-4 md:mb-5 leading-tight`}>
            {language === "ar" ? "نظرة عامة على السوبر ماركت" : "Supermarket Overview"}
          </h3>
          <p className={`text-sm ${subTextColor} mb-4`}>
            {language === "ar"
              ? `عرض البيانات الخاصة بسوبر ماركت: ${user.supermarket_name || user.facility_name || user.facility_id || "غير محدد"}`
              : `Showing data for supermarket: ${user.supermarket_name || user.facility_name || user.facility_id || "Not specified"}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default MainDashboard;
