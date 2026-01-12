import { useState, useMemo, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useWastedBatches, useWasteRecommendations, useBatchJourney, useWasteAnalysis } from "../hooks/useWaste.js";
import WasteRecommendations from "../components/waste/WasteRecommendations.jsx";
import ProductJourney from "../components/waste/ProductJourney.jsx";

function WasteAnalysis({ user }) {
  const { theme } = useTheme();
  const { language } = useLanguage();

  // جلب البيانات الفعلية من قاعدة البيانات
  const { batches: wastedBatches, summary, loading: batchesLoading, reload: reloadBatches } = useWastedBatches(30);
  const { analysis: wasteAnalysisData, loading: analysisLoading, reload: reloadAnalysis } = useWasteAnalysis(30);
  const {
    recommendations: wasteRecommendations,
    isGenerating,
    generate: generateRecommendations,
  } = useWasteRecommendations({ limit: 10 });

  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const { journey: batchJourney, loading: journeyLoading } = useBatchJourney(selectedBatchId);

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
  const borderClass = theme === "dark" ? "border-white/10" : "border-[#9FE7F5]/40";
  const cardBgClass = theme === "dark"
    ? "bg-slate-900/80 backdrop-blur-xl border-white/10"
    : "bg-gradient-to-br from-[#F0FAFC]/95 to-[#E6F7FB]/90 backdrop-blur-xl border-[#9FE7F5]/40 shadow-lg";

  // الإحصائيات من البيانات الفعلية - تستخدم تحليل الAPI أولاً
  const wasteStats = useMemo(() => {
    // استخدام الإحصائيات من analysis API إذا توفرت
    if (wasteAnalysisData?.summary) {
      return {
        totalCartons: wasteAnalysisData.summary.total_cartons || 0,
        totalWaste: wasteAnalysisData.summary.total_quantity || 0,
        totalIncidents: wasteAnalysisData.summary.total_events || 0,
        avgConfidence: 0.82,
        uniqueCauses: wasteAnalysisData.summary.unique_causes || wasteAnalysisData.by_type?.length || 0,
        totalCost: wasteAnalysisData.summary.total_cost || 0
      };
    }

    // حساب من بيانات الدفعات المهدورة كبديل
    const totalCartons = summary?.total_cartons || wastedBatches.reduce((sum, b) => sum + (b.waste_cartons || 0), 0);
    const totalWaste = summary?.total_waste || wastedBatches.reduce((sum, b) => sum + (b.wasteAmount || 0), 0);
    const incidentCount = summary?.incident_count || wastedBatches.length;
    const totalCost = summary?.total_cost || wastedBatches.reduce((sum, b) => sum + (b.cost_loss || 0), 0);
    const uniqueCauses = new Set(wastedBatches.filter(b => b.rootCause && b.rootCause !== 'Unknown').map(b => b.rootCause)).size || 0;
    const avgConfidence = wastedBatches.length > 0
      ? wastedBatches.reduce((sum, b) => sum + (b.confidence || 0.8), 0) / wastedBatches.length
      : 0.82;

    return {
      totalCartons,
      totalWaste,
      totalIncidents: incidentCount,
      avgConfidence,
      uniqueCauses,
      totalCost
    };
  }, [wastedBatches, summary, wasteAnalysisData]);

  // تحليل الأسباب الجذرية من البيانات الفعلية
  const rootCauseStats = useMemo(() => {
    const causeCount = {};
    const causeAmount = {};

    wastedBatches.forEach((item) => {
      const cause = item.rootCause || "Unknown";
      causeCount[cause] = (causeCount[cause] || 0) + 1;
      causeAmount[cause] = (causeAmount[cause] || 0) + (item.waste_cartons || 0);
    });

    return Object.keys(causeCount).map((cause) => ({
      cause,
      causeName: getCauseName(cause),
      count: causeCount[cause],
      amount: causeAmount[cause],
    })).sort((a, b) => b.amount - a.amount);
  }, [wastedBatches, language]);

  function getCauseName(cause) {
    const causeMap = {
      "Storage": language === "ar" ? "سوء التخزين" : "Storage Issues",
      "Transport": language === "ar" ? "مشاكل النقل" : "Transport Issues",
      "Overproduction": language === "ar" ? "الإفراط في الإنتاج" : "Overproduction",
      "Expiry": language === "ar" ? "انتهاء الصلاحية" : "Expiry",
      "Damage": language === "ar" ? "التلف الفيزيائي" : "Physical Damage",
      "Unknown": language === "ar" ? "غير معروف" : "Unknown"
    };
    return causeMap[cause] || cause;
  }

  const COLORS = {
    "Expiry": "#ef4444",
    "Storage": "#f59e0b",
    "Transport": "#3b82f6",
    "Overproduction": "#8b5cf6",
    "Damage": "#ec4899",
    "Unknown": "#6b7280"
  };

  const getStageLabel = (stage) => {
    const stageMap = {
      factory: language === "ar" ? "المصنع" : "Factory",
      warehouse: language === "ar" ? "المستودع" : "Warehouse",
      transport: language === "ar" ? "النقل" : "Transport",
      distributor: language === "ar" ? "الموزع" : "Distributor",
      retail: language === "ar" ? "السوبرماركت" : "Supermarket"
    };
    return stageMap[stage] || stage;
  };

  const handleViewJourney = (batchId) => {
    setSelectedBatchId(selectedBatchId === batchId ? null : batchId);
  };

  const handleGenerateRecommendations = async () => {
    try {
      await generateRecommendations();
    } catch (err) {
      console.error("Error generating recommendations:", err);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([reloadBatches?.(), reloadAnalysis?.()]);
  };

  const maxAmount = Math.max(...rootCauseStats.map(s => s.amount), 1);

  if (batchesLoading && wastedBatches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className={`text-lg font-semibold ${textColor}`}>
            {language === "ar" ? "جاري تحميل بيانات الهدر..." : "Loading waste data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className={`text-2xl md:text-4xl font-bold ${textColor} mb-2`}>
              {language === "ar" ? "تحليل الهدر" : "Waste Analysis"}
            </h2>
            <p className={`text-sm md:text-lg ${subTextColor}`}>
              {language === "ar" ? "تتبع رحلة المنتج وتحليل أسباب الهدر بالذكاء الاصطناعي" : "Track product journey and analyze waste causes with AI"}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={batchesLoading}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-[#429EBD] to-[#2d7a9a] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" /></svg>
            {batchesLoading ? (language === "ar" ? "جاري..." : "...") : (language === "ar" ? "تحديث البيانات" : "Refresh Data")}
          </button>
        </div>
      </div>

      {/* Stats Cards - الإحصائيات بالكراتين */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-xl border-2 ${borderClass} ${cardBgClass}`}>
          <div className={`text-sm ${subTextColor}`}>{language === "ar" ? "إجمالي الهدر" : "Total Waste"}</div>
          <div className={`text-3xl font-bold mt-1 ${textColor}`}>{wasteStats.totalCartons.toLocaleString()}</div>
          <div className={`text-xs mt-1 ${subTextColor}`}>{language === "ar" ? "كرتون" : "cartons"}</div>
        </div>
        <div className={`p-5 rounded-xl border-2 ${borderClass} ${cardBgClass}`}>
          <div className={`text-sm ${subTextColor}`}>{language === "ar" ? "عدد الحوادث" : "Incidents"}</div>
          <div className={`text-3xl font-bold mt-1 ${textColor}`}>{wasteStats.totalIncidents}</div>
          <div className={`text-xs mt-1 ${subTextColor}`}>{language === "ar" ? "حادثة" : "incidents"}</div>
        </div>
        <div className={`p-5 rounded-xl border-2 ${borderClass} ${cardBgClass}`}>
          <div className={`text-sm ${subTextColor}`}>{language === "ar" ? "دقة التحليل" : "Analysis Accuracy"}</div>
          <div className="text-3xl font-bold mt-1 text-emerald-500">{Math.round(wasteStats.avgConfidence * 100)}%</div>
          <div className={`text-xs mt-1 ${subTextColor}`}>{language === "ar" ? "متوسط الثقة" : "avg confidence"}</div>
        </div>
        <div className={`p-5 rounded-xl border-2 ${borderClass} ${cardBgClass}`}>
          <div className={`text-sm ${subTextColor}`}>{language === "ar" ? "الأسباب" : "Causes"}</div>
          <div className={`text-3xl font-bold mt-1 ${textColor}`}>{wasteStats.uniqueCauses}</div>
          <div className={`text-xs mt-1 ${subTextColor}`}>{language === "ar" ? "سبب مختلف" : "different causes"}</div>
        </div>
      </div>

      {/* توزيع الأسباب الجذرية */}
      {rootCauseStats.length > 0 && (
        <div className={`rounded-xl border-2 ${borderClass} ${cardBgClass} p-6`}>
          <h3 className={`text-xl font-bold mb-6 ${textColor}`}>
            {language === "ar" ? "توزيع الأسباب الجذرية تحليل AI" : "Root Cause Distribution (ChatGPT Analysis)"}
          </h3>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-56 h-56">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {(() => {
                  let currentAngle = 0;
                  const total = rootCauseStats.reduce((sum, s) => sum + s.count, 0);
                  return rootCauseStats.map((stat, index) => {
                    const percentage = stat.count / total;
                    const angle = percentage * 360;
                    const startAngle = currentAngle;
                    currentAngle += angle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = ((startAngle + angle) * Math.PI) / 180;

                    const x1 = 50 + 40 * Math.cos(startRad);
                    const y1 = 50 + 40 * Math.sin(startRad);
                    const x2 = 50 + 40 * Math.cos(endRad);
                    const y2 = 50 + 40 * Math.sin(endRad);

                    const largeArc = angle > 180 ? 1 : 0;

                    return (
                      <path
                        key={index}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={COLORS[stat.cause] || "#6b7280"}
                        stroke={theme === "dark" ? "#1e293b" : "#ffffff"}
                        strokeWidth="1"
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    );
                  });
                })()}
                <circle cx="50" cy="50" r="25" fill={theme === "dark" ? "#1e293b" : "#ffffff"} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${textColor}`}>{wasteStats.totalIncidents}</span>
                <span className={`text-xs ${subTextColor}`}>{language === "ar" ? "حادثة" : "incidents"}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {rootCauseStats.map((stat, index) => {
                const percentage = Math.round((stat.count / wastedBatches.length) * 100);
                return (
                  <div key={index} className={`p-3 rounded-lg ${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"} flex items-center gap-3`}>
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[stat.cause] || "#6b7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${textColor}`}>{stat.causeName}</div>
                      <div className={`text-xs ${subTextColor}`}>{stat.count} ({percentage}%) - {stat.amount} {language === "ar" ? "كرتون" : "cartons"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* تحليل تفصيلي للأسباب */}
      {rootCauseStats.length > 0 && (
        <div className={`rounded-xl border-2 ${borderClass} ${cardBgClass} p-6`}>
          <h3 className={`text-xl font-bold mb-6 ${textColor}`}>
            {language === "ar" ? "تحليل تفصيلي للأسباب" : "Detailed Cause Analysis"}
          </h3>

          <div className="space-y-4">
            {rootCauseStats.map((stat, index) => {
              const widthPercent = (stat.amount / maxAmount) * 100;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32 text-right flex-shrink-0">
                    <span className={`text-sm font-semibold ${textColor}`}>{stat.causeName}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className={`h-10 rounded-lg ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                      <div
                        className="h-full rounded-lg flex items-center justify-between px-3 transition-all duration-500"
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: COLORS[stat.cause] || "#6b7280",
                          minWidth: "80px"
                        }}
                      >
                        <span className="text-white text-xs font-bold">{stat.count} {language === "ar" ? "حادثة" : "inc"}</span>
                        <span className="text-white text-sm font-bold">{stat.amount} {language === "ar" ? "كرتون" : "cartons"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Journey Section - رحلة المنتج */}
      {selectedBatchId && (
        <ProductJourney
          journey={batchJourney}
          loading={journeyLoading}
        />
      )}



      {/* التوصيات الذكية - في الأسفل */}
      <WasteRecommendations
        recommendations={wasteRecommendations}
        onGenerate={handleGenerateRecommendations}
        isGenerating={isGenerating}
      />
    </div>
  );
}

export default WasteAnalysis;
