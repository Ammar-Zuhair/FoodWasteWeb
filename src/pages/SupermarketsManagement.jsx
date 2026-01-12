import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { getSupermarkets, createSupermarket, updateSupermarket, deleteSupermarket } from "../utils/api/supermarkets.js";
import { getStoredUser } from "../utils/api/auth.js";

function SupermarketsManagement() {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const user = getStoredUser();

  const [supermarkets, setSupermarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSupermarket, setEditingSupermarket] = useState(null);
  const [deletingSupermarket, setDeletingSupermarket] = useState(null);
  const [saving, setSaving] = useState(false);

  // Yemeni governorates
  const governorates = [
    { value: "sanaa", label: language === "ar" ? "صنعاء" : "Sana'a" },
    { value: "aden", label: language === "ar" ? "عدن" : "Aden" },
    { value: "taiz", label: language === "ar" ? "تعز" : "Taiz" },
    { value: "hodeidah", label: language === "ar" ? "الحديدة" : "Hodeidah" },
    { value: "ibb", label: language === "ar" ? "إب" : "Ibb" },
    { value: "dhamar", label: language === "ar" ? "ذمار" : "Dhamar" },
    { value: "mukalla", label: language === "ar" ? "المكلا" : "Mukalla" },
    { value: "sayun", label: language === "ar" ? "سيئون" : "Sayun" },
    { value: "marib", label: language === "ar" ? "مأرب" : "Marib" },
  ];

  const initialFormState = {
    name: "",
    code: "",
    governorate: "",
    address: "",
    manager: "",
    phone: "",
    employees: 0,
    area: 0,
    products_count: 0,
    daily_sales_target: 0,
    status: "active",
  };
  const [formData, setFormData] = useState(initialFormState);

  // Dummy Yemen supermarkets with rich data
  const dummySupermarkets = useMemo(() => [
    { id: "sm-001", name: language === "ar" ? "هايل مارت - صنعاء الزبيري" : "Hayel Mart - Sana'a Zubairi", code: "HM-SAN-001", governorate: "sanaa", address: language === "ar" ? "شارع الزبيري، أمام البنك المركزي" : "Zubairi St, Front of Central Bank", manager: language === "ar" ? "أحمد محمد الصنعاني" : "Ahmed Mohammed Al-Sanaani", phone: "+967 1 234567", employees: 25, area: 450, products_count: 1250, daily_sales: 85000, daily_sales_target: 80000, customers_today: 320, status: "active" },
    { id: "sm-002", name: language === "ar" ? "هايل مارت - صنعاء حدة" : "Hayel Mart - Sana'a Hadda", code: "HM-SAN-002", governorate: "sanaa", address: language === "ar" ? "شارع حدة، بجوار مستشفى الثورة" : "Hadda St, Next to Revolution Hospital", manager: language === "ar" ? "محمد علي العمري" : "Mohammed Ali Al-Omari", phone: "+967 1 345678", employees: 20, area: 380, products_count: 1100, daily_sales: 72000, daily_sales_target: 70000, customers_today: 280, status: "active" },
    { id: "sm-003", name: language === "ar" ? "هايل مارت - عدن كريتر" : "Hayel Mart - Aden Crater", code: "HM-ADN-001", governorate: "aden", address: language === "ar" ? "كريتر، شارع الملكة أروى" : "Crater, Queen Arwa St", manager: language === "ar" ? "سالم عبدالله العدني" : "Salem Abdullah Al-Adeni", phone: "+967 2 456789", employees: 18, area: 350, products_count: 980, daily_sales: 65000, daily_sales_target: 60000, customers_today: 245, status: "active" },
    { id: "sm-004", name: language === "ar" ? "هايل مارت - عدن المعلا" : "Hayel Mart - Aden Ma'alla", code: "HM-ADN-002", governorate: "aden", address: language === "ar" ? "المعلا، شارع الميناء" : "Ma'alla, Port Street", manager: language === "ar" ? "خالد حسين البحري" : "Khalid Hussein Al-Bahri", phone: "+967 2 567890", employees: 15, area: 280, products_count: 820, daily_sales: 48000, daily_sales_target: 50000, customers_today: 190, status: "warning" },
    { id: "sm-005", name: language === "ar" ? "هايل مارت - تعز المظفر" : "Hayel Mart - Taiz Muzaffar", code: "HM-TAZ-001", governorate: "taiz", address: language === "ar" ? "المظفر، شارع جمال" : "Muzaffar, Jamal St", manager: language === "ar" ? "علي أحمد التعزي" : "Ali Ahmed Al-Taizi", phone: "+967 4 678901", employees: 15, area: 320, products_count: 850, daily_sales: 55000, daily_sales_target: 55000, customers_today: 210, status: "active" },
    { id: "sm-006", name: language === "ar" ? "هايل مارت - الحديدة" : "Hayel Mart - Hodeidah", code: "HM-HOD-001", governorate: "hodeidah", address: language === "ar" ? "شارع صنعاء، الحديدة" : "Sana'a St, Hodeidah", manager: language === "ar" ? "عمر فهد الحديدي" : "Omar Fahd Al-Hodaidi", phone: "+967 3 789012", employees: 12, area: 260, products_count: 720, daily_sales: 42000, daily_sales_target: 45000, customers_today: 165, status: "warning" },
    { id: "sm-007", name: language === "ar" ? "هايل مارت - إب" : "Hayel Mart - Ibb", code: "HM-IBB-001", governorate: "ibb", address: language === "ar" ? "المشنة، إب" : "Mashna, Ibb", manager: language === "ar" ? "فاطمة سعيد الإبي" : "Fatima Saeed Al-Ibbi", phone: "+967 4 890123", employees: 10, area: 220, products_count: 650, daily_sales: 38000, daily_sales_target: 40000, customers_today: 145, status: "active" },
    { id: "sm-008", name: language === "ar" ? "هايل مارت - المكلا" : "Hayel Mart - Mukalla", code: "HM-MKL-001", governorate: "mukalla", address: language === "ar" ? "الديس الشرقية، المكلا" : "Dis, Mukalla", manager: language === "ar" ? "سعيد محمد باوزير" : "Saeed Mohammed Bawazir", phone: "+967 5 901234", employees: 8, area: 200, products_count: 580, daily_sales: 32000, daily_sales_target: 35000, customers_today: 120, status: "active" },
    { id: "sm-009", name: language === "ar" ? "هايل مارت - ذمار" : "Hayel Mart - Dhamar", code: "HM-DHM-001", governorate: "dhamar", address: language === "ar" ? "وسط المدينة، ذمار" : "Downtown, Dhamar", manager: language === "ar" ? "ياسر علي الذماري" : "Yasser Ali Al-Dhamari", phone: "+967 6 012345", employees: 8, area: 180, products_count: 520, daily_sales: 28000, daily_sales_target: 30000, customers_today: 105, status: "maintenance" },
    { id: "sm-010", name: language === "ar" ? "هايل مارت - مأرب" : "Hayel Mart - Marib", code: "HM-MAR-001", governorate: "marib", address: language === "ar" ? "شارع الجمهورية، مأرب" : "Republic St, Marib", manager: language === "ar" ? "ناصر أحمد المأربي" : "Nasser Ahmed Al-Maribi", phone: "+967 6 123456", employees: 10, area: 240, products_count: 680, daily_sales: 45000, daily_sales_target: 42000, customers_today: 175, status: "active" },
  ], [language]);

  useEffect(() => {
    loadSupermarkets();
  }, []);

  const loadSupermarkets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSupermarkets({ organization_id: user?.organization_id });
      if (data && data.length > 0) {
        const enrichedData = data.map((sm, index) => {
          const dummy = dummySupermarkets[index % dummySupermarkets.length];
          return {
            ...sm,
            manager: sm.manager || sm.contact_person || dummy.manager,
            phone: sm.phone || dummy.phone,
            governorate: sm.governorate || dummy.governorate,
            address: sm.address || dummy.address,
            employees: sm.employees || dummy.employees,
            area: sm.area || dummy.area,
            products_count: sm.products_count || dummy.products_count,
            daily_sales: sm.daily_sales || dummy.daily_sales,
            daily_sales_target: sm.daily_sales_target || dummy.daily_sales_target,
            customers_today: sm.customers_today || dummy.customers_today,
          };
        });
        setSupermarkets(enrichedData);
      } else {
        setSupermarkets(dummySupermarkets);
      }
    } catch (err) {
      setSupermarkets(dummySupermarkets);
    } finally {
      setLoading(false);
    }
  };

  const displaySupermarkets = useMemo(() => {
    let result = supermarkets.length > 0 ? supermarkets : dummySupermarkets;

    if (searchTerm) {
      result = result.filter(sm =>
        sm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sm.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sm.manager?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      result = result.filter(sm => sm.status === filterStatus);
    }

    return result;
  }, [supermarkets, dummySupermarkets, searchTerm, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const all = supermarkets.length > 0 ? supermarkets : dummySupermarkets;
    return {
      total: all.length,
      active: all.filter(s => s.status === "active").length,
      warning: all.filter(s => s.status === "warning").length,
      maintenance: all.filter(s => s.status === "maintenance").length,
      totalEmployees: all.reduce((sum, s) => sum + (s.employees || 0), 0),
      totalDailySales: all.reduce((sum, s) => sum + (s.daily_sales || 0), 0),
      totalProducts: all.reduce((sum, s) => sum + (s.products_count || 0), 0),
      totalCustomers: all.reduce((sum, s) => sum + (s.customers_today || 0), 0),
    };
  }, [supermarkets, dummySupermarkets]);

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
  const borderClass = theme === "dark" ? "border-white/10" : "border-[#9FE7F5]/40";
  const cardBgClass = theme === "dark" ? "bg-slate-900/80" : "bg-white/50";
  const inputClass = `w-full px-4 py-3 rounded-xl border-2 ${borderClass} ${cardBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50 transition-all`;

  const getGovernorateLabel = (value) => {
    const gov = governorates.find(g => g.value === value);
    return gov ? gov.label : value || "-";
  };

  const openAddModal = () => {
    setEditingSupermarket(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const openEditModal = (supermarket) => {
    setEditingSupermarket(supermarket);
    setFormData({
      name: supermarket.name || "",
      code: supermarket.code || "",
      governorate: supermarket.governorate || "",
      address: supermarket.address || "",
      manager: supermarket.manager || "",
      phone: supermarket.phone || "",
      employees: supermarket.employees || 0,
      area: supermarket.area || 0,
      products_count: supermarket.products_count || 0,
      daily_sales_target: supermarket.daily_sales_target || 0,
      status: supermarket.status || "active",
    });
    setShowModal(true);
  };

  const openDeleteModal = (supermarket) => {
    setDeletingSupermarket(supermarket);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingSupermarket) {
        try {
          await updateSupermarket(editingSupermarket.id, formData);
          await loadSupermarkets();
        } catch (err) {
          setSupermarkets(prev => prev.map(sm => sm.id === editingSupermarket.id ? { ...sm, ...formData } : sm));
        }
      } else {
        const newSupermarket = {
          id: `sm-${Date.now()}`,
          ...formData,
          daily_sales: 0,
          customers_today: 0,
          created_at: new Date().toISOString().split('T')[0],
        };
        try {
          await createSupermarket(formData);
          await loadSupermarkets();
        } catch (err) {
          setSupermarkets(prev => [...prev, newSupermarket]);
        }
      }
      setShowModal(false);
      setFormData(initialFormState);
      setEditingSupermarket(null);
    } catch (err) {
      alert(language === "ar" ? "حدث خطأ أثناء الحفظ" : "Error saving supermarket");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSupermarket) return;

    setSaving(true);
    try {
      try {
        await deleteSupermarket(deletingSupermarket.id);
        await loadSupermarkets();
      } catch (err) {
        setSupermarkets(prev => prev.filter(sm => sm.id !== deletingSupermarket.id));
      }
      setShowDeleteModal(false);
      setDeletingSupermarket(null);
    } catch (err) {
      alert(language === "ar" ? "حدث خطأ أثناء الحذف" : "Error deleting supermarket");
    } finally {
      setSaving(false);
    }
  };

  const getSalesPerformance = (daily_sales, target) => {
    if (!target) return { percentage: 0, color: "gray" };
    const percentage = Math.round((daily_sales / target) * 100);
    if (percentage >= 100) return { percentage, color: "emerald" };
    if (percentage >= 80) return { percentage, color: "amber" };
    return { percentage, color: "red" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#429EBD] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg font-semibold ${textColor}`}>
            {language === "ar" ? "جاري تحميل السوبر ماركت..." : "Loading supermarkets..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className={`text-2xl md:text-4xl font-bold ${textColor} mb-2`}>
            {language === "ar" ? "إدارة السوبر ماركتات" : "Supermarkets Management"}
          </h2>
          <p className={`text-sm md:text-lg ${subTextColor}`}>
            {language === "ar" ? "إضافة وتعديل وحذف السوبر ماركتات ومتابعة أدائها" : "Add, edit and delete supermarkets and track their performance"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          {language === "ar" ? "إضافة سوبر ماركت" : "Add Supermarket"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-2xl font-bold ${textColor}`}>{stats.total}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "إجمالي" : "Total"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 border-emerald-500/30 ${theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"} text-center hover:scale-105 transition-transform`}>
          <div className="text-2xl font-bold text-emerald-500">{stats.active}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "نشط" : "Active"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 border-amber-500/30 ${theme === "dark" ? "bg-amber-500/10" : "bg-amber-50"} text-center hover:scale-105 transition-transform`}>
          <div className="text-2xl font-bold text-amber-500">{stats.warning}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "تحذير" : "Warning"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 border-orange-500/30 ${theme === "dark" ? "bg-orange-500/10" : "bg-orange-50"} text-center hover:scale-105 transition-transform`}>
          <div className="text-2xl font-bold text-orange-500">{stats.maintenance}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "صيانة" : "Maintenance"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-2xl font-bold text-blue-500`}>{stats.totalEmployees}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "موظف" : "Employees"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-2xl font-bold text-purple-500`}>{stats.totalProducts.toLocaleString("en-US")}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "منتج" : "Products"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-xl font-bold text-[#429EBD]`}>{(stats.totalDailySales / 1000).toFixed(0)}K</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "مبيعات يومية" : "Daily Sales"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-2xl font-bold text-pink-500`}>{stats.totalCustomers.toLocaleString("en-US")}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "عميل اليوم" : "Customers"}</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <svg className={`absolute top-1/2 ${language === "ar" ? "right-4" : "left-4"} transform -translate-y-1/2 ${subTextColor}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={language === "ar" ? "البحث بالاسم أو الكود..." : "Search by name or code..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} ${language === "ar" ? "pr-12" : "pl-12"}`}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={inputClass}
          style={{ width: "auto", minWidth: "150px" }}
        >
          <option value="all">{language === "ar" ? "جميع الحالات" : "All Statuses"}</option>
          <option value="active">{language === "ar" ? "نشط" : "Active"}</option>
          <option value="warning">{language === "ar" ? "تحذير" : "Warning"}</option>
          <option value="maintenance">{language === "ar" ? "صيانة" : "Maintenance"}</option>
          <option value="inactive">{language === "ar" ? "مغلق" : "Closed"}</option>
        </select>
      </div>

      {/* Supermarkets Table */}
      <div className={`rounded-xl border-2 ${borderClass} ${cardBgClass} overflow-hidden shadow-lg`}>
        <div className={`px-6 py-4 border-b ${borderClass} ${theme === "dark" ? "bg-slate-800/50" : "bg-[#E0F7FA]"} flex items-center justify-between`}>
          <h3 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            {language === "ar" ? "قائمة السوبر ماركتات" : "Supermarkets List"}
            <span className={`text-sm font-normal ${subTextColor}`}>({displaySupermarkets.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === "dark" ? "bg-slate-800/30" : "bg-slate-50"}`}>
              <tr>
                <th className={`text-right py-4 px-4 ${textColor} font-bold text-sm`}>
                  {language === "ar" ? "السوبر ماركت" : "Supermarket"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "المدير" : "Manager"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "المحافظة" : "Governorate"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "الموظفين" : "Staff"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "المنتجات" : "Products"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "أداء المبيعات" : "Sales Performance"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "الحالة" : "Status"}
                </th>
                <th className={`text-center py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {displaySupermarkets.length === 0 ? (
                <tr>
                  <td colSpan="8" className={`text-center py-12 ${subTextColor}`}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
                      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {language === "ar" ? "لا توجد سوبر ماركتات مطابقة للبحث" : "No supermarkets match your search"}
                  </td>
                </tr>
              ) : (
                displaySupermarkets.map((sm) => {
                  const perf = getSalesPerformance(sm.daily_sales, sm.daily_sales_target);
                  return (
                    <tr key={sm.id} className={`border-b ${borderClass} hover:${theme === "dark" ? "bg-white/5" : "bg-black/5"} transition-colors`}>
                      <td className={`py-4 px-4`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                              <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                            </svg>
                          </div>
                          <div>
                            <p className={`font-semibold ${textColor}`}>{sm.name}</p>
                            <p className={`text-xs ${subTextColor} font-mono`}>{sm.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 px-4`}>
                        <div>
                          <p className={`${textColor} text-sm`}>{sm.manager || "-"}</p>
                          <p className={`text-xs ${subTextColor}`}>{sm.phone || ""}</p>
                        </div>
                      </td>
                      <td className={`py-3 px-4 ${textColor}`}>{getGovernorateLabel(sm.governorate)}</td>
                      <td className={`py-3 px-4 text-center`}>
                        <span className={`font-semibold text-blue-500`}>{sm.employees || 0}</span>
                      </td>
                      <td className={`py-3 px-4 text-center`}>
                        <span className={`font-semibold ${textColor}`}>{(sm.products_count || 0).toLocaleString("en-US")}</span>
                      </td>
                      <td className={`py-3 px-4`}>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-${perf.color}-500`}
                              style={{ width: `${Math.min(perf.percentage, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium text-${perf.color}-500`}>{perf.percentage}%</span>
                        </div>
                        <p className={`text-xs ${subTextColor} mt-1`}>
                          {(sm.daily_sales || 0).toLocaleString("en-US")} / {(sm.daily_sales_target || 0).toLocaleString("en-US")}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sm.status || "active"} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(sm)}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition-colors"
                            title={language === "ar" ? "تعديل" : "Edit"}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(sm)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                            title={language === "ar" ? "حذف" : "Delete"}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>

            <div className={`relative transform overflow-hidden rounded-2xl ${theme === "dark" ? "bg-slate-900 border border-white/10" : "bg-white"} p-0 text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl animate-scale-in flex flex-col max-h-[90vh]`}>
              {/* Header */}
              <div className={`p-6 border-b ${borderClass} flex items-center justify-between`}>
                <h3 className={`text-2xl font-bold ${textColor}`}>
                  {editingSupermarket
                    ? (language === "ar" ? "تعديل السوبر ماركت" : "Edit Supermarket")
                    : (language === "ar" ? "إضافة سوبر ماركت جديد" : "Add New Supermarket")
                  }
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={`text-2xl ${subTextColor} hover:${textColor} transition-colors`}
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <form id="supermarket-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "اسم السوبر ماركت" : "Supermarket Name"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={language === "ar" ? "مثال: هايل مارت - صنعاء" : "e.g., Hayel Mart - Sana'a"}
                      className={inputClass}
                    />
                  </div>

                  {/* Code */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "الكود" : "Code"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder={language === "ar" ? "مثال: HM-SAN-001" : "e.g., HM-SAN-001"}
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  {/* Governorate */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "المحافظة" : "Governorate"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.governorate}
                      onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">{language === "ar" ? "اختر المحافظة..." : "Select governorate..."}</option>
                      {governorates.map(gov => (
                        <option key={gov.value} value={gov.value}>{gov.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "العنوان" : "Address"}
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder={language === "ar" ? "العنوان التفصيلي" : "Detailed address"}
                      className={inputClass}
                    />
                  </div>

                  {/* Manager */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "المدير" : "Manager"}
                    </label>
                    <input
                      type="text"
                      value={formData.manager}
                      onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                      placeholder={language === "ar" ? "اسم المدير" : "Manager name"}
                      className={inputClass}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "رقم الهاتف" : "Phone"}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+967 X XXXXXX"
                      className={inputClass}
                      dir="ltr"
                    />
                  </div>

                  {/* Employees */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "عدد الموظفين" : "Employees"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.employees}
                      onChange={(e) => setFormData({ ...formData, employees: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>

                  {/* Area */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "المساحة (م²)" : "Area (m²)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>

                  {/* Products Count */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "عدد المنتجات" : "Products Count"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.products_count}
                      onChange={(e) => setFormData({ ...formData, products_count: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>

                  {/* Daily Sales Target */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "هدف المبيعات اليومي (ر.ي)" : "Daily Sales Target (YER)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.daily_sales_target}
                      onChange={(e) => setFormData({ ...formData, daily_sales_target: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2">
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "الحالة" : "Status"}
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: "active", label: language === "ar" ? "نشط" : "Active", color: "emerald" },
                        { value: "warning", label: language === "ar" ? "تحذير" : "Warning", color: "amber" },
                        { value: "maintenance", label: language === "ar" ? "صيانة" : "Maintenance", color: "orange" },
                        { value: "inactive", label: language === "ar" ? "مغلق" : "Closed", color: "red" },
                      ].map(status => (
                        <label
                          key={status.value}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${formData.status === status.value
                            ? `border-${status.color}-500 bg-${status.color}-500/20 shadow-sm`
                            : `${borderClass} ${cardBgClass} hover:border-purple-500/40`
                            }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={status.value}
                            checked={formData.status === status.value}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="sr-only"
                          />
                          <span className={`w-3 h-3 rounded-full bg-${status.color}-500`}></span>
                          <span className={textColor}>{status.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className={`p-6 border-t ${borderClass} flex gap-3`}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 ${borderClass} ${textColor} hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold`}
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  form="supermarket-form"
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 transition-all font-bold"
                >
                  {saving
                    ? (language === "ar" ? "جاري الحفظ..." : "Saving...")
                    : (editingSupermarket
                      ? (language === "ar" ? "حفظ التعديلات" : "Save Changes")
                      : (language === "ar" ? "إضافة السوبر ماركت" : "Add Supermarket")
                    )
                  }
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSupermarket && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
              onClick={() => setShowDeleteModal(false)}
            ></div>

            <div className={`relative transform overflow-hidden rounded-2xl ${theme === "dark" ? "bg-slate-900 border border-white/10" : "bg-white"} p-0 text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md animate-scale-in`}>
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 className={`text-2xl font-bold ${textColor} mb-3`}>
                  {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                </h3>
                <p className={`${subTextColor} text-lg leading-relaxed`}>
                  {language === "ar"
                    ? `هل أنت متأكد من حذف "${deletingSupermarket.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                    : `Are you sure you want to delete "${deletingSupermarket.name}"? This action cannot be undone.`
                  }
                </p>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 ${borderClass} ${textColor} hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold`}
                  >
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-xl disabled:opacity-50 transition-all font-bold"
                  >
                    {saving
                      ? (language === "ar" ? "جاري الحذف..." : "Deleting...")
                      : (language === "ar" ? "نعم، احذف" : "Yes, Delete")
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default SupermarketsManagement;
