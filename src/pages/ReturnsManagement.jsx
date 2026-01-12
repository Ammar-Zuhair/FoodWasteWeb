import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useReturns, useReturnsRecommendations, useReturnsDashboard } from "../hooks/useReturns.js";
import {
  FaSearch, FaFilter, FaArrowLeft, FaArrowRight, FaEye,
  FaCheckCircle, FaTimesCircle, FaRobot, FaExclamationTriangle,
  FaBoxOpen, FaAngleDown, FaAngleUp, FaMicrochip
} from "react-icons/fa";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import ReturnsDashboard from "../components/returns/ReturnsDashboard.jsx";
import ReturnActionModal from "../components/returns/ReturnActionModal.jsx";

// Helper components
const InsightCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className={`p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-slate-800 flex items-center justify-between`}>
    <div>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{title}</p>
      <h3 className="text-2xl font-bold dark:text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-20`}>
      <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

function ReturnsManagement({ user }) {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ limit: 10, offset: 0, search: "", status: "" });

  // Hooks
  const { stats, loading: statsLoading } = useReturnsDashboard();
  const { returns, pagination, loading, error, reload, updateStatus, updateItemOutcome } = useReturns(filters);
  const { recommendations, fetchRecommendations, loading: aiLoading } = useReturnsRecommendations({ autoLoad: false });

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Action Modal State
  const [actionModal, setActionModal] = useState({ isOpen: false, item: null });

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";

  // --- Handlers ---
  const handlePageChange = (newPage) => {
    setPage(newPage);
    setFilters(prev => ({ ...prev, offset: (newPage - 1) * prev.limit }));
  };

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, offset: 0 }));
    setPage(1);
  };

  const handleStatusFilter = (e) => {
    setFilters(prev => ({ ...prev, status: e.target.value, offset: 0 }));
    setPage(1);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    if (confirm("Are you sure you want to update status?")) {
      await updateStatus(id, newStatus, "Updated via UI");
    }
  };

  const openProcessModal = (e, item) => {
    e.stopPropagation();
    setActionModal({ isOpen: true, item });
  };

  const handleItemProcessed = async (itemId, outcome, notes) => {
    const success = await updateItemOutcome(itemId, outcome, notes);
    if (success) {
      // Ideally reload data to update UI 
      // (reload called inside hook)
    }
  };


  return (
    <div className="space-y-6 pb-20" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
        <div>
          <h2 className={`text-4xl font-semibold ${textColor} mb-2`}>
            {t("returnsManagement", "Returns Management")}
          </h2>
          <p className={`${subTextColor}`}>
            {language === "ar" ? "إدارة ومراقبة المرتجعات وتحليل الأسباب" : "Manage returns, track status, and analyze insights"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { setIsAIModalOpen(true); fetchRecommendations(); }}
            className="px-5 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 flex items-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <FaRobot className="animate-bounce" />
            {language === "ar" ? "توصيات الذكاء الاصطناعي" : "AI Insights"}
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <ReturnsDashboard stats={stats} loading={statsLoading} />

      {/* Filters & Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rtl:right-3 rtl:left-auto" />
            <input
              type="text"
              placeholder={language === "ar" ? "بحث عن رقم، عميل، مورد..." : "Search by number, customer, supplier..."}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 rtl:pr-10 rtl:pl-4"
              onChange={handleSearch}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:outline-none"
              onChange={handleStatusFilter}
            >
              <option value="">{language === "ar" ? "كل الحالات" : "All Statuses"}</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500 mx-auto mb-2"></div>
              Loading...
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-xs uppercase text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3 w-10"></th>
                  <th className="px-6 py-3">{language === "ar" ? "الرقم" : "Return #"}</th>
                  <th className="px-6 py-3">{language === "ar" ? "التاريخ" : "Date"}</th>
                  <th className="px-6 py-3">{language === "ar" ? "العميل / المورد" : "Customer / Supplier"}</th>
                  <th className="px-6 py-3">{language === "ar" ? "العناصر" : "Items"}</th>
                  <th className="px-6 py-3">{language === "ar" ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {returns.map((ret) => {
                  const isExpanded = selectedReturn === ret.id;
                  return (
                    <React.Fragment key={ret.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => setSelectedReturn(isExpanded ? null : ret.id)}>
                        <td className="px-6 py-4 text-center">
                          {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{ret.return_number}</td>
                        <td className="px-6 py-4">{ret.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{ret.customer || '-'}</span>
                            <span className="text-xs text-gray-500">{ret.supplier || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{ret.items_count} items</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                                ${ret.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              ret.status === 'approved' ? 'bg-green-100 text-green-800' :
                                ret.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {ret.status_label || ret.status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-slate-900/50 animate-slide-in">
                          <td colSpan="6" className="p-4">
                            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-inner border border-gray-100 dark:border-gray-700 overflow-hidden">
                              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200">
                                {language === 'ar' ? 'تفاصيل العناصر' : 'Items Details'}
                              </div>
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700 text-xs">
                                  <tr>
                                    <th className="px-4 py-2">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                                    <th className="px-4 py-2">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                                    <th className="px-4 py-2">{language === 'ar' ? 'السبب' : 'Reason'}</th>
                                    <th className="px-4 py-2">{language === 'ar' ? 'الحالة' : 'Condition'}</th>
                                    <th className="px-4 py-2 text-right">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {ret.items && ret.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="px-4 py-3">{item.product_name}</td>
                                      <td className="px-4 py-3">{item.quantity}</td>
                                      <td className="px-4 py-3 text-red-500">{item.reason}</td>
                                      <td className="px-4 py-3">{item.condition}</td>
                                      <td className="px-4 py-3 text-right">
                                        {item.outcome ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                            <FaCheckCircle className="w-3 h-3" /> {item.outcome}
                                          </span>
                                        ) : (
                                          <button
                                            onClick={(e) => openProcessModal(e, item)}
                                            className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
                                          >
                                            {language === 'ar' ? 'اتخاذ قرار' : 'Decide Action'}
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                  {(!ret.items || ret.items.length === 0) && (
                                    <tr>
                                      <td colSpan="5" className="px-4 py-3 text-center text-gray-400 italic">No detailed items found</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {language === "ar" ? `صفحة ${page} من ${pagination.totalPages}` : `Page ${page} of ${pagination.totalPages}`}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-slate-700"
            >
              <FaArrowLeft className={language === "ar" ? "rotate-180" : ""} />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-slate-700"
            >
              <FaArrowRight className={language === "ar" ? "rotate-180" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <ReturnActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        item={actionModal.item}
        onItemProcessed={handleItemProcessed}
      />

      {/* Header */}
      {/* AI Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsAIModalOpen(false)}
            ></div>

            <div className={`relative transform overflow-hidden rounded-2xl ${theme === "dark" ? "bg-slate-900 border border-white/10 shadow-2xl" : "bg-white shadow-2xl"} p-0 text-right transition-all sm:my-8 sm:w-full sm:max-w-2xl animate-scale-in flex flex-col max-h-[90vh]`}>
              {/* Header */}
              <div className={`p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between`}>
                <div>
                  <h3 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                    <FaRobot className="text-purple-600" />
                    {language === "ar" ? "تحليل الذكاء الاصطناعي" : "AI Recommendations"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAIModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimesCircle className="w-8 h-8" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 text-right">
                {aiLoading ? (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-lg font-medium text-gray-500">
                      {language === "ar" ? "جاري التفكير..." : "Thinking..."}
                    </span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-xl text-purple-900 dark:text-purple-100">
                            {language === "ar" ? rec.title : rec.title_en || rec.title}
                          </h4>
                          <span className="text-xs px-3 py-1 bg-white dark:bg-purple-800 rounded-full border border-purple-200 text-purple-600 dark:text-purple-200 font-bold uppercase tracking-wider">
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-base text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                          {language === "ar" ? rec.description : rec.description_en || rec.description}
                        </p>

                        <div className="mb-4 p-3 bg-white dark:bg-purple-900/40 rounded-lg border border-purple-100 dark:border-purple-800/50">
                          <h5 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                            <FaMicrochip className="w-3 h-3" />
                            {language === "ar" ? "لماذا هذه التوصية؟" : "Why this recommendation?"}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            {language === "ar" ? rec.reasoning_ar || rec.reasoning : rec.reasoning_en || rec.reasoning}
                          </p>
                        </div>
                        {rec.savings > 0 && (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-lg">
                            <FaCheckCircle className="w-5 h-5" />
                            <span>
                              {language === "ar" ? "توفير متوقع: " : "Expected Savings: "}${rec.savings}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaBoxOpen className="text-gray-400 text-3xl" />
                    </div>
                    <p className="text-lg text-gray-500">
                      {language === "ar" ? "لا توجد توصيات حالياً." : "No recommendations generated yet."}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3`}>
                <button
                  onClick={() => fetchRecommendations(true)}
                  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all font-bold flex items-center gap-2"
                >
                  <FaRobot />
                  {language === "ar" ? "توليد توصية جديدة" : "Generate New"}
                </button>

                <button
                  onClick={() => setIsAIModalOpen(false)}
                  className={`px-8 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-all font-bold`}
                >
                  {language === "ar" ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div >
  );
}

export default ReturnsManagement;
