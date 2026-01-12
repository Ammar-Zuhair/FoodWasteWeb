import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useDonations, useDonationStats, useCreateDonation, useUpdateDonation, useDeleteDonation, useCharities, usePotentialDonations, useDonationImpact, useCreateCharity } from "../hooks/useCharity.js";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { getStoredUser } from "../utils/api/auth.js";

function CharityIntegration({ user: propUser }) {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const storedUser = getStoredUser();
  const user = propUser || (storedUser ? {
    id: storedUser.id,
    organization_id: storedUser.organization_id,
    role: storedUser.role,
  } : null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDonation, setEditingDonation] = useState(null);

  const { donations, loading, error, reload } = useDonations({
    organization_id: user?.organization_id,
  });
  const { stats } = useDonationStats({
    organization_id: user?.organization_id,
  });
  const { create, loading: creating } = useCreateDonation();
  const { update, loading: updating } = useUpdateDonation();
  const { delete: deleteDonation, loading: deleting } = useDeleteDonation();

  // New Hooks
  const { charities, reload: reloadCharities } = useCharities({ organization_id: user?.organization_id });
  const { suggestions, fetchSuggestions } = usePotentialDonations(user?.organization_id);
  const { report: impactReport } = useDonationImpact('month');

  // Trigger fetchSuggestions on mount
  useEffect(() => {
    if (user?.organization_id) fetchSuggestions();
  }, [user?.organization_id]);

  const { create: createCharityHook, loading: creatingCharity } = useCreateCharity();
  const [showAddCharityModal, setShowAddCharityModal] = useState(false);
  const [charityFormData, setCharityFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleCreateCharity = async (e) => {
    e.preventDefault();
    try {
      await createCharityHook({
        organization_id: user?.organization_id,
        ...charityFormData,
        preferred_categories: [], // Default empty
        status_id: 1 // Default Active
      });
      setShowAddCharityModal(false);
      setCharityFormData({ name: "", contact_person: "", phone: "", email: "", address: "" });
      reloadCharities();
    } catch (err) {
      alert(err.message || "Failed to create charity");
    }
  };


  // Form state
  const [formData, setFormData] = useState({
    batch_id: "",
    charity_id: "",
    charity_organization: "",
    charity_contact: "",
    quantity: "",
    donation_date: new Date().toISOString().split('T')[0],
    status: "Pending", // Default strict status
    food_safety_check_passed: false,
  });

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
  const borderClass = theme === "dark" ? "border-white/10" : "border-[#9FE7F5]/40";
  const cardBgClass = theme === "dark" ? "bg-slate-900/80" : "bg-white/50";

  // Filter donations
  const filteredDonations = useMemo(() => {
    if (!donations || !Array.isArray(donations)) return [];

    return donations.filter((donation) => {
      const matchesSearch =
        donation.charity_organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.batch?.batch_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || donation.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [donations, searchTerm, selectedStatus]);

  // Statistics
  const donationStats = useMemo(() => {
    if (!stats) {
      return {
        total_donations: filteredDonations.length,
        total_quantity: filteredDonations.reduce((sum, d) => sum + (d.quantity || 0), 0),
        pending: filteredDonations.filter((d) => d.status === "pending").length,
        confirmed: filteredDonations.filter((d) => d.status === "confirmed").length,
        delivered: filteredDonations.filter((d) => d.status === "delivered").length,
      };
    }
    return {
      total_donations: stats.total_donations || filteredDonations.length,
      total_quantity: stats.total_quantity || filteredDonations.reduce((sum, d) => sum + (d.quantity || 0), 0),
      pending: stats.status_counts?.pending || 0,
      confirmed: stats.status_counts?.confirmed || 0,
      delivered: stats.status_counts?.delivered || 0,
    };
  }, [stats, filteredDonations]);

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    try {
      await create({
        organization_id: user?.organization_id,
        ...formData,
        quantity: parseFloat(formData.quantity),
        donation_date: new Date(formData.donation_date).toISOString(),
      });
      setShowCreateModal(false);
      setFormData({
        batch_id: "",
        charity_id: "",
        charity_organization: "",
        charity_contact: "",
        quantity: "",
        donation_date: new Date().toISOString().split('T')[0],
        status: "Pending",
        food_safety_check_passed: false,
      });
      reload();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء إنشاء التبرع");
    }
  };

  const handleUpdateDonation = async (donationId, status) => {
    try {
      await update(donationId, { status });
      reload();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء تحديث التبرع");
    }
  };

  const handleDeleteDonation = async (donationId) => {
    if (!confirm("هل أنت متأكد من حذف هذا التبرع؟")) return;
    try {
      await deleteDonation(donationId);
      reload();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء حذف التبرع");
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      Pending: language === "ar" ? "قيد الانتظار" : "Pending",
      Sent: language === "ar" ? "تم الإرسال" : "Sent",
      Received: language === "ar" ? "تم الاستلام" : "Received",
      pending: language === "ar" ? "قيد الانتظار" : "Pending",
      confirmed: language === "ar" ? "مؤكد" : "Confirmed",
      delivered: language === "ar" ? "تم التسليم" : "Delivered",
    };
    return statusMap[status] || status;
  };

  if (loading && (!donations || donations.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className={`text-lg font-semibold ${textColor}`}>
          {language === "ar" ? "جاري تحميل بيانات التبرعات..." : "Loading donations data..."}
        </p>
      </div>
    );
  }

  if (error && (!donations || donations.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
        <p className={`text-lg font-semibold text-red-500`}>
          {language === "ar" ? "حدث خطأ أثناء تحميل البيانات" : "Failed to load data"}
        </p>
        <button
          onClick={reload}
          className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
        >
          {language === "ar" ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-8 animate-slide-in">
        <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-4xl font-semibold ${textColor} mb-3 leading-tight tracking-tight`}>
              {t("charityIntegration") || "التكامل مع الجمعيات الخيرية"}
            </h2>
            <p className={`text-lg ${subTextColor} leading-relaxed font-normal`}>
              {language === "ar"
                ? "إدارة التبرعات والجمعيات الخيرية"
                : "Manage donations and charity organizations"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${theme === "dark"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-[#429EBD] hover:bg-[#053F5C] text-white"
                } shadow-lg hover:shadow-xl`}
            >
              {language === "ar" ? "+ إضافة تبرع جديد" : "+ New Donation"}
            </button>
            <button
              onClick={() => setShowAddCharityModal(true)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${theme === "dark"
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-[#053F5C]"
                } shadow-lg hover:shadow-xl`}
            >
              {language === "ar" ? "+ إضافة جمعية" : "+ Add Charity"}
            </button>
          </div>
        </div>
      </div>

      {/* Impact Report Section */}
      {impactReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-slide-in">
          <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass} relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={`text-xl font-bold ${textColor} mb-4`}>
              {language === "ar" ? "معدل تحويل النفايات" : "Waste Diversion Rate"}
            </h3>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-emerald-500">
                {(impactReport.waste_diversion_rate || 0).toFixed(1)}%
              </span>
              <span className={`text-sm ${subTextColor} mb-2`}>
                {language === "ar" ? "من القيمة الإجمالية" : "of total value derived"}
              </span>
            </div>
            <div className="mt-4 text-sm font-medium text-emerald-600/80">
              {language === "ar"
                ? `تم التبرع بـ ${(impactReport.total_donated_value || 0).toFixed(2)} ريال هذا الشهر`
                : `Donated YER ${(impactReport.total_donated_value || 0).toFixed(2)} this month`
              }
            </div>
          </div>

          <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
            <h3 className={`text-xl font-bold ${textColor} mb-4`}>
              {language === "ar" ? "أفضل الجمعيات المساهمة" : "Top Contributing Charities"}
            </h3>
            <div className="space-y-3">
              {impactReport.top_charities.map((charity, index) => (
                <div key={index} className="flex justify-between items-center border-b border-gray-100/10 pb-2 last:border-0">
                  <span className={`${textColor} font-medium`}>{charity.charity_name}</span>
                  <span className="text-emerald-500 font-bold">YER {(charity.total_value || 0).toFixed(2)}</span>
                </div>
              ))}
              {impactReport.top_charities.length === 0 && (
                <div className={`text-center py-4 ${subTextColor}`}>
                  {language === "ar" ? "لا توجد بيانات متاحة" : "No data available"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggested Donations Section */}
      {suggestions.length > 0 && (
        <div className="mb-8 animate-slide-in">
          <h3 className={`text-xl font-bold ${textColor} mb-4 flex items-center gap-2`}>
            <span className="bg-amber-100 text-amber-600 p-1 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </span>
            {language === "ar" ? "فرص تبرع مقترحة (ذكاء اصطناعي)" : "Smart Donation Suggestions"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestions.map((item, idx) => (
              <div key={idx} className={`${cardBgClass} border border-amber-200/50 rounded-lg p-4 hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                    {item.suggestion_reason === "Expiring Soon" ? (language === "ar" ? "تنتهي قريباً" : "Expiring Soon") : item.suggestion_reason}
                  </span>
                  <button
                    onClick={() => {
                      setFormData(prev => ({ ...prev, batch_id: item.batch_id, quantity: item.quantity }));
                      setShowCreateModal(true);
                    }}
                    className="text-emerald-500 hover:text-emerald-600 font-semibold text-sm"
                  >
                    {language === "ar" ? "تبرع الآن" : "Donate Now"}
                  </button>
                </div>
                <div className={`${textColor} font-semibold mb-1`}>
                  {language === "ar" ? item.product_name_ar || item.product_name : item.product_name}
                  {!item.product_name && !item.product_name_ar && item.batch_code}
                </div>
                <div className={`${subTextColor} text-sm mb-1`}>
                  {language === "ar" ? "الموقع" : "Location"}: {item.location_name} - {item.storage_area}
                </div>
                <div className={`${subTextColor} text-xs`}>
                  {language === "ar" ? "الدفعة" : "Batch"}: {item.batch_code} | {item.quantity} {language === "ar" ? "وحدة" : "units"}
                </div>
                <div className={`text-xs text-red-400 mt-1`}>
                  Exp: {new Date(item.expiry_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "إجمالي التبرعات" : "Total Donations"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`}>
            {donationStats.total_donations}
          </div>
        </div>
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "إجمالي الكمية" : "Total Quantity"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`}>
            {(donationStats.total_quantity || 0).toFixed(2)}
          </div>
        </div>
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "قيد الانتظار" : "Pending"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`}>
            {donationStats.pending}
          </div>
        </div>
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "تم التسليم" : "Delivered"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`}>
            {donationStats.delivered}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`${cardBgClass} rounded-xl p-4 border ${borderClass} flex gap-4 items-center`}>
        <input
          type="text"
          placeholder={language === "ar" ? "بحث..." : "Search..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-1 px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
            } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
        />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
            } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
        >
          <option value="all">{language === "ar" ? "جميع الحالات" : "All Status"}</option>
          <option value="Pending">{language === "ar" ? "قيد الانتظار" : "Pending"}</option>
          <option value="Sent">{language === "ar" ? "تم الإرسال" : "Sent"}</option>
          <option value="Received">{language === "ar" ? "تم الاستلام" : "Received"}</option>
        </select>
      </div>

      {/* Donations Table */}
      <div className={`${cardBgClass} rounded-xl border ${borderClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === "dark" ? "bg-slate-800" : "bg-slate-50"}`}>
              <tr>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "الجمعية الخيرية" : "Charity Organization"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "رقم الدفعة" : "Batch Code"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "الكمية" : "Quantity"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "تاريخ التبرع" : "Donation Date"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "الحالة" : "Status"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`px-6 py-8 text-center ${subTextColor}`}>
                    {language === "ar" ? "لا توجد تبرعات" : "No donations found"}
                  </td>
                </tr>
              ) : (
                filteredDonations.map((donation) => (
                  <tr
                    key={donation.id}
                    className={`border-t ${borderClass} hover:${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50/50"} transition-colors`}
                  >
                    <td className={`px-6 py-4 ${textColor}`}>
                      <div className="font-semibold">{donation.charity_organization}</div>
                      {donation.charity_contact && (
                        <div className={`text-sm ${subTextColor}`}>{donation.charity_contact}</div>
                      )}
                    </td>
                    <td className={`px-6 py-4 ${textColor}`}>
                      {donation.batch?.batch_code || "-"}
                    </td>
                    <td className={`px-6 py-4 ${textColor} font-semibold`}>
                      {donation.quantity} {language === "ar" ? "وحدة" : "units"}
                    </td>
                    <td className={`px-6 py-4 ${textColor}`}>
                      {new Date(donation.donation_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={getStatusLabel(donation.status)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {donation.status === "Pending" && (
                          <button
                            onClick={() => handleUpdateDonation(donation.id, "Sent")}
                            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                              ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                              }`}
                          >
                            {language === "ar" ? "إرسال" : "Mark Sent"}
                          </button>
                        )}
                        {donation.status === "Sent" && (
                          <button
                            onClick={() => handleUpdateDonation(donation.id, "Received")}
                            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                          >
                            {language === "ar" ? "استلام" : "Mark Received"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDonation(donation.id)}
                          className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                        >
                          {language === "ar" ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Definitions */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setShowCreateModal(false)}
          ></div>

          <div className={`relative w-full max-w-md ${theme === "dark" ? "bg-slate-900 border border-white/10" : "bg-white"} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in`}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${borderClass}`}>
              <h3 className={`text-2xl font-bold ${textColor}`}>
                {language === "ar" ? "إضافة تبرع جديد" : "New Donation"}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <form id="donation-form" onSubmit={handleCreateDonation} className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "رقم الدفعة" : "Batch ID"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.batch_id}
                    onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                      } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "الكمية" : "Quantity"}
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                      } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "تاريخ التبرع" : "Donation Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.donation_date}
                    onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                      } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "الجمعية" : "Charity"}
                  </label>
                  <select
                    value={formData.charity_id}
                    onChange={(e) => {
                      const selectedCharity = charities.find(c => c.id === parseInt(e.target.value));
                      setFormData({
                        ...formData,
                        charity_id: e.target.value,
                        charity_organization: selectedCharity ? selectedCharity.name : "",
                        charity_contact: selectedCharity ? selectedCharity.contact_person || "" : ""
                      });
                    }}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                      } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
                  >
                    <option value="">{language === "ar" ? "اختر جمعية..." : "Select Charity..."}</option>
                    {charities.map(charity => (
                      <option key={charity.id} value={charity.id}>{charity.name}</option>
                    ))}
                    <option value="other">{language === "ar" ? "أخرى (إدخال يدوي)" : "Other (Manual Entry)"}</option>
                  </select>
                </div>

                {(formData.charity_id === "other" || (!formData.charity_id && formData.charity_organization)) && (
                  <div className="animate-fade-in">
                    <input
                      type="text"
                      placeholder={language === "ar" ? "اسم الجمعية" : "Charity Name"}
                      required
                      value={formData.charity_organization}
                      onChange={(e) => setFormData({ ...formData, charity_organization: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                        } focus:outline-none focus:ring-2 focus:ring-[#429EBD] mt-2`}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="safetyCheck"
                    required
                    checked={formData.food_safety_check_passed}
                    onChange={(e) => setFormData({ ...formData, food_safety_check_passed: e.target.checked })}
                    className="w-5 h-5 accent-emerald-500"
                  />
                  <label htmlFor="safetyCheck" className={`text-sm ${textColor}`}>
                    {language === "ar" ? "تم التحقق من سلامة الأغذية" : "Food safety check passed"}
                  </label>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className={`p-6 border-t ${borderClass} flex gap-3`}>
              <button
                type="submit"
                form="donation-form"
                disabled={creating}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${theme === "dark"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-[#429EBD] hover:bg-[#053F5C] text-white"
                  } disabled:opacity-50`}
              >
                {creating
                  ? language === "ar"
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : language === "ar"
                    ? "حفظ"
                    : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    batch_id: "",
                    charity_id: "",
                    charity_organization: "",
                    charity_contact: "",
                    quantity: "",
                    donation_date: new Date().toISOString().split('T')[0],
                    status: "Pending",
                    food_safety_check_passed: false,
                  });
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${theme === "dark"
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-[#053F5C]"
                  }`}
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showAddCharityModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setShowAddCharityModal(false)}
          ></div>

          <div className={`relative w-full max-w-md ${theme === "dark" ? "bg-slate-900 border border-white/10" : "bg-white"} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in`}>
            {/* Header */}
            <div className={`p-6 border-b ${borderClass}`}>
              <h3 className={`text-2xl font-bold ${textColor}`}>
                {language === "ar" ? "إضافة جمعية خيرية" : "Add Charity"}
              </h3>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <form id="charity-form" onSubmit={handleCreateCharity} className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "اسم الجمعية" : "Charity Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={charityFormData.name}
                    onChange={(e) => setCharityFormData({ ...charityFormData, name: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                      } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "الشخص المسؤول" : "Contact Person"}
                  </label>
                  <input
                    type="text"
                    value={charityFormData.contact_person}
                    onChange={(e) => setCharityFormData({ ...charityFormData, contact_person: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                      } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "رقم الهاتف" : "Phone"}
                  </label>
                  <input
                    type="tel"
                    value={charityFormData.phone}
                    onChange={(e) => setCharityFormData({ ...charityFormData, phone: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"
                      } focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${borderClass} flex gap-3`}>
              <button
                type="submit"
                form="charity-form"
                disabled={creatingCharity}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${theme === "dark"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-[#429EBD] hover:bg-[#053F5C] text-white"
                  } disabled:opacity-50`}
              >
                {creatingCharity ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ" : "Save")}
              </button>
              <button
                type="button"
                onClick={() => setShowAddCharityModal(false)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${theme === "dark"
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-[#053F5C]"
                  }`}
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default CharityIntegration;
