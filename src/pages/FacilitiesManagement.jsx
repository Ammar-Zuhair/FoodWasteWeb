import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { getFacilities, createFacility, updateFacility, deleteFacility } from "../utils/api/facilities.js";
import { getStoredUser } from "../utils/api/auth.js";

function FacilitiesManagement() {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const user = getStoredUser();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [deletingFacility, setDeletingFacility] = useState(null);
  const [saving, setSaving] = useState(false);

  // Facility Type Logic - Normalization
  // Maps legacy/duplicate database codes to a standard set of preferred codes
  const TYPE_MAPPING = {
    'MANUFACTUR': 'factory',
    'store': 'retail_store',
    'retail': 'retail_store',
    'supermarket': 'retail_store', // Merge supermarket into retail for simplicity
    'distribution': 'distribution_center',
    'COLD_STORA': 'cold_storage',
    'refrigerator': 'cold_storage',
    'freezer': 'cold_storage'
  };

  const getNormalizedType = (type) => {
    return TYPE_MAPPING[type] || type;
  };

  // Clean, preferred options for User Interface
  const facilityTypes = [
    { value: "warehouse", labelAr: "مستودع", labelEn: "Warehouse" },
    { value: "factory", labelAr: "مصنع", labelEn: "Factory" },
    { value: "retail_store", labelAr: "متجر / سوبرماركت ", labelEn: "Store & Supermarket" },
    { value: "distribution_center", labelAr: "مركز توزيع", labelEn: "Distribution Center" },
    { value: "cold_storage", labelAr: "مخزن تبريد", labelEn: "Cold Storage" },
  ];

  // Governorates - fetched from database
  const [governorates, setGovernorates] = useState([]);

  const initialFormState = {
    name: "",
    facility_type: "warehouse",
    governorate: "",
    address: "",
    capacity: 0,
    temperature_min: 0,
    temperature_max: 25,
    manager: "",
    phone: "",
    status: "active",
  };
  const [formData, setFormData] = useState(initialFormState);


  useEffect(() => {
    loadFacilities();
    loadGovernoratesFromAPI();
  }, []);

  const loadGovernoratesFromAPI = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://srv1265534.hstgr.cloud'}/api/v1/data/governorates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const govList = data.governorates || [];
        setGovernorates(govList.map(g => ({
          value: g.code,
          label: language === 'ar' ? g.name_ar : g.name_en,
          name_ar: g.name_ar,
          name_en: g.name_en,
        })));
      }
    } catch (err) {
      console.error('Error loading governorates:', err);
    }
  };

  const loadFacilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFacilities({ organization_id: user?.organization_id });
      // Handle both array and object response formats
      const data = Array.isArray(response) ? response : (response?.facilities || []);
      setFacilities(data);
      if (data.length === 0) {
        setError(language === "ar" ? "لا توجد منشآت متاحة" : "No facilities available");
      }
    } catch (err) {
      console.error("Error loading facilities:", err);
      setError(err.message || (language === "ar" ? "فشل تحميل البيانات" : "Failed to load data"));
      setFacilities([]); // Don't use dummy data
    } finally {
      setLoading(false);
    }
  };

  const displayFacilities = useMemo(() => {
    let result = facilities;

    // Filter by search
    if (searchTerm) {
      result = result.filter(f =>
        (f.name_ar || f.name_en || f.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type using normalization
    if (filterType !== "all") {
      result = result.filter(f => getNormalizedType(f.facility_type) === filterType);
    }

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter(f => f.status === filterStatus);
    }

    return result;
  }, [facilities, searchTerm, filterType, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const allFacilities = facilities;
    // Map of normalized type -> count
    const typeCounts = {};

    allFacilities.forEach(f => {
      const type = getNormalizedType(f.facility_type);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return {
      total: allFacilities.length,
      active: allFacilities.filter(f => f.status === "active").length,
      warning: allFacilities.filter(f => f.status === "warning").length,
      maintenance: allFacilities.filter(f => f.status === "maintenance").length,
      totalCapacity: allFacilities.reduce((sum, f) => sum + (f.capacity || 0), 0),
      avgUtilization: Math.round(allFacilities.reduce((sum, f) => sum + (f.utilization || 0), 0) / allFacilities.length) || 0,

      warehouses: typeCounts['warehouse'] || 0,
      coldStorage: typeCounts['cold_storage'] || 0,
    };
  }, [facilities]);

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
  const borderClass = theme === "dark" ? "border-white/10" : "border-[#9FE7F5]/40";
  const cardBgClass = theme === "dark" ? "bg-slate-900/80" : "bg-white/50";
  const inputClass = `w-full px-4 py-3 rounded-xl border-2 ${borderClass} ${cardBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50 transition-all`;

  const getFacilityTypeLabel = (rawType, lang = 'ar') => {
    const type = getNormalizedType(rawType);
    const found = facilityTypes.find(t => t.value === type);
    if (found) {
      return lang === 'ar' ? found.labelAr : found.labelEn;
    }
    return rawType || '-';
  };

  // SVG icons for facility types
  const getFacilityTypeIcon = (rawType) => {
    const type = getNormalizedType(rawType);
    const iconColor = theme === "dark" ? "#94a3b8" : "#429EBD";

    const icons = {
      warehouse: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
          <path d="M6 18h12" /><path d="M6 14h12" /><path d="M6 10h12" />
        </svg>
      ),
      cold_storage: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
        </svg>
      ),
      factory: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
          <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        </svg>
      ),
      retail_store: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      distribution_center: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
        </svg>
      ),
    };

    return icons[type] || (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    );
  };

  const getGovernorateLabel = (facility) => {
    // Use API-provided names if available
    if (language === 'ar' && facility.governorate_ar) {
      return facility.governorate_ar;
    }
    if (language === 'en' && facility.governorate_en) {
      return facility.governorate_en;
    }
    // Fallback to local governorates list
    const gov = governorates.find(g => g.value === facility.governorate);
    return gov ? gov.label : facility.governorate || '-';
  };

  const openAddModal = () => {
    setEditingFacility(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const openEditModal = (facility) => {
    setEditingFacility(facility);
    setFormData({
      name: (language === 'ar' ? facility.name_ar : facility.name_en) || facility.name || "",
      facility_type: facility.facility_type || "warehouse",
      governorate: facility.governorate || "",
      address: facility.address || "",
      capacity: facility.capacity || 0,
      temperature_min: facility.temperature_min || 0,
      temperature_max: facility.temperature_max || 25,
      manager: facility.manager || "",
      phone: facility.phone || "",
      status: facility.status || "active",
    });
    setShowModal(true);
  };

  const openDeleteModal = (facility) => {
    setDeletingFacility(facility);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingFacility) {
        try {
          await updateFacility(editingFacility.id, formData);
          await loadFacilities();
        } catch (err) {
          setFacilities(prev => prev.map(f => f.id === editingFacility.id ? { ...f, ...formData } : f));
        }
      } else {
        const newFacility = {
          id: `fac-${Date.now()}`,
          ...formData,
          utilization: 0,
          created_at: new Date().toISOString().split('T')[0],
        };
        try {
          await createFacility(formData);
          await loadFacilities();
        } catch (err) {
          setFacilities(prev => [...prev, newFacility]);
        }
      }
      setShowModal(false);
      setFormData(initialFormState);
      setEditingFacility(null);
    } catch (err) {
      alert(language === "ar" ? "حدث خطأ أثناء الحفظ" : "Error saving facility");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFacility) return;

    setSaving(true);
    try {
      try {
        await deleteFacility(deletingFacility.id);
        await loadFacilities();
      } catch (err) {
        setFacilities(prev => prev.filter(f => f.id !== deletingFacility.id));
      }
      setShowDeleteModal(false);
      setDeletingFacility(null);
    } catch (err) {
      alert(language === "ar" ? "حدث خطأ أثناء الحذف" : "Error deleting facility");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#429EBD] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg font-semibold ${textColor}`}>
            {language === "ar" ? "جاري تحميل المخازن..." : "Loading facilities..."}
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
            {language === "ar" ? "إدارة المخازن والمرافق" : "Facilities Management"}
          </h2>
          <p className={`text-sm md:text-lg ${subTextColor}`}>
            {language === "ar" ? "إضافة وتعديل وحذف المخازن والثلاجات والمستودعات" : "Add, edit and delete warehouses, fridges and storage facilities"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          {language === "ar" ? "إضافة مرفق" : "Add Facility"}
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
          <div className={`text-2xl font-bold text-blue-500`}>{stats.warehouses}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "مستودع" : "Warehouses"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-2xl font-bold text-cyan-500`}>{stats.coldStorage}</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "تبريد" : "Cold Storage"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-xl font-bold text-purple-500`}>{(stats.totalCapacity / 1000).toFixed(1)}K</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "سعة" : "Capacity"}</div>
        </div>
        <div className={`p-4 rounded-xl border-2 ${borderClass} ${cardBgClass} text-center hover:scale-105 transition-transform`}>
          <div className={`text-2xl font-bold text-[#429EBD]`}>{stats.avgUtilization}%</div>
          <div className={`text-xs ${subTextColor}`}>{language === "ar" ? "استخدام" : "Utilization"}</div>
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
            placeholder={language === "ar" ? "البحث في المخازن..." : "Search facilities..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} ${language === "ar" ? "pr-12" : "pl-12"}`}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={inputClass}
          style={{ width: "auto", minWidth: "150px" }}
        >
          <option value="all">{language === "ar" ? "جميع الأنواع" : "All Types"}</option>
          {facilityTypes.map(type => (
            <option key={type.value} value={type.value}>{language === "ar" ? type.labelAr : type.labelEn}</option>
          ))}
        </select>
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
          <option value="inactive">{language === "ar" ? "غير نشط" : "Inactive"}</option>
        </select>
      </div>

      {/* Facilities Table */}
      <div className={`rounded-xl border-2 ${borderClass} ${cardBgClass} overflow-hidden shadow-lg`}>
        <div className={`px-6 py-4 border-b ${borderClass} ${theme === "dark" ? "bg-slate-800/50" : "bg-[#E0F7FA]"} flex items-center justify-between`}>
          <h3 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
              <path d="M6 18h12" /><path d="M6 14h12" /><path d="M6 10h12" />
            </svg>
            {language === "ar" ? "قائمة المخازن والمرافق" : "Facilities List"}
            <span className={`text-sm font-normal ${subTextColor}`}>({displayFacilities.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === "dark" ? "bg-slate-800/30" : "bg-slate-50"}`}>
              <tr>
                <th className={`text-right py-4 px-4 ${textColor} font-bold text-sm`}>
                  {language === "ar" ? "المرفق" : "Facility"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "النوع" : "Type"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "المحافظة" : "Governorate"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "السعة" : "Capacity"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "الاستخدام" : "Utilization"}
                </th>
                <th className={`text-right py-3 px-4 ${textColor} font-semibold`}>
                  {language === "ar" ? "درجة الحرارة" : "Temperature"}
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
              {displayFacilities.length === 0 ? (
                <tr>
                  <td colSpan="8" className={`text-center py-12 ${subTextColor}`}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
                      <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
                    </svg>
                    {language === "ar" ? "لا توجد مخازن مطابقة للبحث" : "No facilities match your search"}
                  </td>
                </tr>
              ) : (
                displayFacilities.map((facility) => (
                  <tr key={facility.id} className={`border-b ${borderClass} hover:${theme === "dark" ? "bg-white/5" : "bg-black/5"} transition-colors`}>
                    <td className={`py-4 px-4`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === "dark" ? "bg-slate-700" : "bg-slate-100"}`}>
                          {getFacilityTypeIcon(facility.facility_type)}
                        </div>
                        <div>
                          <p className={`font-semibold ${textColor}`}>{(language === 'ar' ? facility.name_ar : facility.name_en) || facility.name}</p>
                          <p className={`text-xs ${subTextColor}`}>{facility.manager || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 px-4`}>
                      <div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${theme === "dark" ? "bg-slate-700" : "bg-slate-100"} ${textColor}`}>
                          {facility.facility_type_ar || getFacilityTypeLabel(facility.facility_type, 'ar')}
                        </span>
                        <p className={`text-xs ${subTextColor} mt-1`}>
                          {facility.facility_type_en || getFacilityTypeLabel(facility.facility_type, 'en')}
                        </p>
                      </div>
                    </td>
                    <td className={`py-3 px-4 ${textColor}`}>{getGovernorateLabel(facility)}</td>
                    <td className={`py-3 px-4 text-center`}>
                      <span className={`font-semibold ${textColor}`}>{(facility.capacity || 0).toLocaleString("en-US")}</span>
                    </td>
                    <td className={`py-3 px-4`}>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(facility.utilization || 0) > 85 ? "bg-red-500" :
                              (facility.utilization || 0) > 70 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            style={{ width: `${facility.utilization || 0}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${textColor}`}>{facility.utilization || 0}%</span>
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-center`}>
                      <span className={`font-mono text-sm ${(facility.temperature_max || 0) < 0 ? "text-cyan-400" :
                        (facility.temperature_max || 0) < 10 ? "text-blue-400" : "text-amber-400"
                        }`}>
                        {facility.temperature_min}° ~ {facility.temperature_max}°
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={facility.status || "active"} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(facility)}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition-colors"
                          title={language === "ar" ? "تعديل" : "Edit"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(facility)}
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
                ))
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
                  {editingFacility
                    ? (language === "ar" ? "تعديل المرفق" : "Edit Facility")
                    : (language === "ar" ? "إضافة مرفق جديد" : "Add New Facility")
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
              <form id="facility-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  {/* Facility Name */}
                  <div className="md:col-span-2">
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "اسم المرفق" : "Facility Name"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={language === "ar" ? "مثال: مستودع التبريد الرئيسي" : "e.g., Main Cold Storage"}
                      className={inputClass}
                    />
                  </div>

                  {/* Facility Type */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "نوع المرفق" : "Facility Type"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.facility_type}
                      onChange={(e) => setFormData({ ...formData, facility_type: e.target.value })}
                      className={inputClass}
                    >
                      {facilityTypes.map(type => (
                        <option key={type.value} value={type.value}>{language === "ar" ? type.labelAr : type.labelEn}</option>
                      ))}
                    </select>
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

                  {/* Capacity */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "السعة (وحدة)" : "Capacity (units)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>

                  {/* Temperature Range */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "نطاق الحرارة (°C)" : "Temperature Range (°C)"}
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={formData.temperature_min}
                        onChange={(e) => setFormData({ ...formData, temperature_min: parseInt(e.target.value) || 0 })}
                        className={`${inputClass} text-center`}
                        placeholder={language === "ar" ? "من" : "Min"}
                      />
                      <span className={subTextColor}>~</span>
                      <input
                        type="number"
                        value={formData.temperature_max}
                        onChange={(e) => setFormData({ ...formData, temperature_max: parseInt(e.target.value) || 0 })}
                        className={`${inputClass} text-center`}
                        placeholder={language === "ar" ? "إلى" : "Max"}
                      />
                    </div>
                  </div>

                  {/* Manager */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "المسؤول" : "Manager"}
                    </label>
                    <input
                      type="text"
                      value={formData.manager}
                      onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                      placeholder={language === "ar" ? "اسم المسؤول" : "Manager name"}
                      className={inputClass}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {language === "ar" ? "رقم الهاتف" : "Phone Number"}
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
                        { value: "inactive", label: language === "ar" ? "غير نشط" : "Inactive", color: "red" },
                      ].map(status => (
                        <label
                          key={status.value}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all ${formData.status === status.value
                            ? `border-${status.color}-500 bg-${status.color}-500/20 shadow-sm`
                            : `${borderClass} ${cardBgClass} hover:border-cyan-500/40`
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
                  form="facility-form"
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 transition-all font-bold"
                >
                  {saving
                    ? (language === "ar" ? "جاري الحفظ..." : "Saving...")
                    : (editingFacility
                      ? (language === "ar" ? "حفظ التعديلات" : "Save Changes")
                      : (language === "ar" ? "إضافة المرفق" : "Add Facility")
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
      {showDeleteModal && deletingFacility && createPortal(
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
                    ? `هل أنت متأكد من حذف "${deletingFacility.name_ar || deletingFacility.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                    : `Are you sure you want to delete "${deletingFacility.name_en || deletingFacility.name}"? This action cannot be undone.`
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

export default FacilitiesManagement;
