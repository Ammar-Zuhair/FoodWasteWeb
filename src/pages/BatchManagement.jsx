import { useState, useMemo, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import {
  useBatches,
  useBatchesFIFO,
  useBatchesFEFO,
  useCreateBatch,
  useUpdateBatch,
  useShipBatch,
  useBatchAllocations,
} from "../hooks/useBatches.js";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { getStoredUser } from "../utils/api/auth.js";
import { getProducts } from "../utils/api/products.js";

function BatchManagement({ user: propUser }) {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const storedUser = getStoredUser();
  const user = propUser || (storedUser ? {
    id: storedUser.id,
    organization_id: storedUser.organization_id,
    role: storedUser.role,
    facility_id: storedUser.facility_id,
  } : null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [viewMode, setViewMode] = useState("location"); // "all", "fifo", "fefo", "location"

  // Load batches based on view mode
  const allBatchesHook = useBatches({
    organization_id: user?.organization_id,
    facility_id: user?.facility_id,
  });
  const fifoBatchesHook = useBatchesFIFO({
    organization_id: user?.organization_id,
    facility_id: user?.facility_id,
    status: selectedStatus === "all" ? "in_stock" : selectedStatus,
  });
  const fefoBatchesHook = useBatchesFEFO({
    organization_id: user?.organization_id,
    facility_id: user?.facility_id,
    status: selectedStatus === "all" ? "in_stock" : selectedStatus,
  });
  const allocationsHook = useBatchAllocations({
    organization_id: user?.organization_id,
  });

  // Select the appropriate hook based on view mode
  const getCurrentBatches = () => {
    if (viewMode === "fifo") return fifoBatchesHook;
    if (viewMode === "fefo") return fefoBatchesHook;
    if (viewMode === "location") return {
      batches: allocationsHook.allocations,
      loading: allocationsHook.loading,
      error: allocationsHook.error,
      reload: allocationsHook.reload
    };
    // For "all" and "expired" modes, use regular batches
    return allBatchesHook;
  };

  const { batches, loading, error, reload } = getCurrentBatches();
  const { create, loading: creating } = useCreateBatch();
  const { update, loading: updating } = useUpdateBatch();
  const { ship, loading: shipping } = useShipBatch();

  const [formData, setFormData] = useState({
    product_id: "",
    facility_id: user?.facility_id || "",
    batch_code: "",
    quantity: "",
    unit: "unit",
    production_date: "",
    expiry_date: "",
    status: "in_storage",
  });

  // Load products from API
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.organization_id) return;
      try {
        setLoadingProducts(true);
        const products = await getProducts({
          organization_id: user.organization_id,
          limit: 1000
        });
        setAvailableProducts(products);
      } catch (err) {
        console.error("Error loading products:", err);
        setAvailableProducts([]); // Empty array instead of dummy data
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, [user?.organization_id]);

  // Generate batch code automatically
  const generateBatchCode = (productId) => {
    const product = availableProducts.find(p => p.id === productId || p.id === String(productId));
    if (!product) return "";
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const productName = product.name || product.name_en || product.name_ar || product.sku || "PROD";
    const prefix = productName.substring(0, 3).toUpperCase().replace(/\s/g, '');
    return `${prefix}-${dateStr}-${random}`;
  };

  // Handle product selection
  const handleProductSelect = (productId) => {
    const product = availableProducts.find(p => p.id === productId || p.id === String(productId));
    if (product) {
      const batchCode = generateBatchCode(productId);
      const today = new Date().toISOString().split('T')[0];
      const expiryDate = new Date();
      // Use shelf_life_days from product, default to 30 if not available
      const shelfLifeDays = product.shelf_life_days || 30;
      expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);

      setFormData({
        ...formData,
        product_id: productId,
        batch_code: batchCode,
        unit: product.unit || "unit",
        production_date: today,
        expiry_date: expiryDate.toISOString().split('T')[0],
      });
    } else {
      setFormData({ ...formData, product_id: productId });
    }
  };

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
  const borderClass = theme === "dark" ? "border-white/10" : "border-[#9FE7F5]/40";
  const cardBgClass = theme === "dark" ? "bg-slate-900/80" : "bg-white/50";

  // Dummy batches data - Yemen
  const dummyBatches = useMemo(() => {
    const today = new Date();
    return [
      {
        id: "batch-001",
        batch_code: "MLK-20241210-001",
        product_name: language === "ar" ? "حليب طازج" : "Fresh Milk",
        quantity: 500,
        unit: "l",
        production_date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_storage",
        priority: 1,
        days_until_expiry: 5,
        shelf_life: { remaining_days: 5, status: "warning" },
        location: language === "ar" ? "صنعاء" : "Sana'a",
      },
      {
        id: "batch-002",
        batch_code: "MNG-20241208-015",
        product_name: language === "ar" ? "عصير مانجو" : "Mango Juice",
        quantity: 300,
        unit: "l",
        production_date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 24 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_storage",
        priority: 2,
        days_until_expiry: 24,
        shelf_life: { remaining_days: 24, status: "good" },
        location: language === "ar" ? "عدن" : "Aden",
      },
      {
        id: "batch-003",
        batch_code: "YGT-20241205-008",
        product_name: language === "ar" ? "زبادي" : "Yogurt",
        quantity: 200,
        unit: "unit",
        production_date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_storage",
        priority: 3,
        days_until_expiry: 5,
        shelf_life: { remaining_days: 5, status: "warning" },
        location: language === "ar" ? "تعز" : "Taiz",
      },
      {
        id: "batch-004",
        batch_code: "CHS-20241201-022",
        product_name: language === "ar" ? "جبنة بلدي" : "Local Cheese",
        quantity: 50,
        unit: "kg",
        production_date: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_storage",
        priority: 4,
        days_until_expiry: 8,
        shelf_life: { remaining_days: 8, status: "caution" },
        location: language === "ar" ? "الحديدة" : "Hodeidah",
      },
      {
        id: "batch-005",
        batch_code: "LBN-20241212-003",
        product_name: language === "ar" ? "لبن" : "Laban",
        quantity: 150,
        unit: "l",
        production_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_storage",
        priority: 5,
        days_until_expiry: 9,
        shelf_life: { remaining_days: 9, status: "good" },
        location: language === "ar" ? "إب" : "Ibb",
      },
      {
        id: "batch-006",
        batch_code: "HNY-20241207-011",
        product_name: language === "ar" ? "عسل يمني" : "Yemeni Honey",
        quantity: 100,
        unit: "kg",
        production_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_transit",
        priority: 6,
        days_until_expiry: 365,
        shelf_life: { remaining_days: 365, status: "good" },
        location: language === "ar" ? "حضرموت" : "Hadhramaut",
      },
      {
        id: "batch-007",
        batch_code: "SMN-20241213-002",
        product_name: language === "ar" ? "سمن بلدي" : "Local Ghee",
        quantity: 80,
        unit: "kg",
        production_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_storage",
        priority: 7,
        days_until_expiry: 60,
        shelf_life: { remaining_days: 60, status: "good" },
        location: language === "ar" ? "ذمار" : "Dhamar",
      },
      {
        id: "batch-008",
        batch_code: "BTR-20241115-005",
        product_name: language === "ar" ? "زبدة" : "Butter",
        quantity: 100,
        unit: "g",
        production_date: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_storage",
        priority: 7,
        days_until_expiry: 31,
        shelf_life: { remaining_days: 31, status: "good" },
      },
      {
        id: "batch-009",
        batch_code: "MLK-20241205-018",
        product_name: language === "ar" ? "حليب طازج" : "Fresh Milk",
        quantity: 200,
        unit: "l",
        production_date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: "wasted",
        priority: 0,
        days_until_expiry: -1,
        shelf_life: { remaining_days: -1, status: "expired" },
      },
      {
        id: "batch-010",
        batch_code: "YGT-20241210-012",
        product_name: language === "ar" ? "زبادي" : "Yogurt",
        quantity: 150,
        unit: "unit",
        production_date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: "sold_out",
        priority: 0,
        days_until_expiry: 10,
        shelf_life: { remaining_days: 10, status: "good" },
      },
    ];
  }, [language]);

  const filteredBatches = useMemo(() => {
    if (!batches) return [];

    return batches.filter((batch) => {
      const code = batch.batch_code || "";
      const name = batch.product_name || "";
      const loc = batch.location_name || "";

      const matchesSearch =
        code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === "all" ||
        batch.status === selectedStatus ||
        batch.location_type === selectedStatus;

      // Calculate if batch is expired
      // Prioritize date calculation to match UI rendering, as min_shelf_life_days might be stale
      let isExpired = false;

      const expiryDateStr = batch.actual_expiry || batch.expiry_date || batch.earliest_expiry_date;

      if (expiryDateStr) {
        const expiryDate = new Date(expiryDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isExpired = expiryDate < today;
      } else if (batch.min_shelf_life_days !== undefined && batch.min_shelf_life_days !== null) {
        isExpired = batch.min_shelf_life_days <= 0;
      } else if (batch.days_until_expiry !== undefined && batch.days_until_expiry !== null) {
        isExpired = batch.days_until_expiry <= 0;
      }

      // Filter logic based on view mode
      if (viewMode === "expired") {
        // Expired tab: ONLY show expired batches
        return matchesSearch && matchesStatus && isExpired;
      } else if (viewMode === "all") {
        // All Batches tab: show ALL batches (expired and non-expired)
        return matchesSearch && matchesStatus;
      } else if (viewMode === "location") {
        // Location Tracking: ONLY show non-expired batches (exclude expired)
        // Explicitly check status !== 'expired' to handle the case where matchesStatus is true (e.g. 'all')
        return matchesSearch && matchesStatus && (!isExpired && batch.status !== 'expired');
      } else {
        // Other tabs (fifo, fefo): ONLY show non-expired batches
        return matchesSearch && matchesStatus && (!isExpired && batch.status !== 'expired');
      }
    }).sort((a, b) => {
      if (viewMode === "fifo") {
        return new Date(a.production_date) - new Date(b.production_date);
      }
      if (viewMode === "fefo") {
        return new Date(a.actual_expiry || a.expiry_date) - new Date(b.actual_expiry || b.expiry_date);
      }
      if (viewMode === "location") {
        return (a.min_shelf_life_days || 999) - (b.min_shelf_life_days || 999);
      }
      return 0;
    });
  }, [batches, searchTerm, selectedStatus, viewMode]);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await create({
        ...formData,
        quantity: parseFloat(formData.quantity),
      });
      setShowCreateModal(false);
      setFormData({
        product_id: "",
        facility_id: user?.facility_id || "",
        batch_code: "",
        quantity: "",
        unit: "unit",
        production_date: "",
        expiry_date: "",
        status: "in_storage",
      });
      reload();
    } catch (err) {
      alert(err.message || "Error creating batch");
    }
  };

  const handleUpdateBatch = async (batchId, updates) => {
    try {
      await update(batchId, updates);
      reload();
    } catch (err) {
      alert(err.message || "Error updating batch");
    }
  };

  const handleShipBatch = async (batchId, targetFacilityId) => {
    try {
      await ship(batchId, { target_facility_id: targetFacilityId });
      reload();
    } catch (err) {
      alert(err.message || "Error shipping batch");
    }
  };

  const getShelfLifeColor = (shelfLife) => {
    if (!shelfLife || !shelfLife.status) return "text-gray-500";
    const status = shelfLife.status;
    if (status === "expired" || status === "critical") return "text-red-500";
    if (status === "warning") return "text-yellow-500";
    if (status === "caution") return "text-orange-500";
    return "text-green-500";
  };

  return (
    <div className={`space-y-4 sm:space-y-5 md:space-y-6`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-4 sm:mb-5 md:mb-8">
        <h2 className={`text-xl sm:text-2xl md:text-4xl font-semibold ${textColor} mb-1 sm:mb-1.5 md:mb-3`}>
          {t("batchManagement") || "Batch Management"}
        </h2>
        <p className={`text-xs sm:text-sm md:text-lg ${subTextColor}`}>
          {t("manageProductionBatches") || "Manage production batches and track shelf life"}
        </p>
      </div>

      {/* View Mode Tabs */}
      <div className={`${cardBgClass} ${borderClass} border rounded-xl p-1 mb-4 shadow-inner`}>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("location")}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${viewMode === "location"
              ? "bg-[#429EBD] text-white shadow-md transform scale-[1.02]"
              : `${textColor} hover:bg-white/10`
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {language === "ar" ? "تتبع المواقع" : "Location Tracking"}
            </div>
          </button>
          <button
            onClick={() => setViewMode("expired")}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${viewMode === "expired"
              ? "bg-red-500 text-white shadow-md transform scale-[1.02]"
              : `${textColor} hover:bg-white/10`
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              {language === "ar" ? "البضاعة المنتهية" : "Expired Goods"}
            </div>
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${viewMode === "all"
              ? "bg-[#429EBD] text-white shadow-md transform scale-[1.02]"
              : `${textColor} hover:bg-white/10`
              }`}
          >
            {t("allBatches") || "All Batches"}
          </button>
          <button
            onClick={() => setViewMode("fifo")}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${viewMode === "fifo"
              ? "bg-[#429EBD] text-white shadow-md transform scale-[1.02]"
              : `${textColor} hover:bg-white/10`
              }`}
          >
            {t("fifoList") || "FIFO List"}
          </button>
          <button
            onClick={() => setViewMode("fefo")}
            className={`flex-1 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${viewMode === "fefo"
              ? "bg-[#429EBD] text-white shadow-md transform scale-[1.02]"
              : `${textColor} hover:bg-white/10`
              }`}
          >
            {t("fefoList") || "FEFO List"}
          </button>
        </div>
      </div>

      {/* View Mode Description */}
      {viewMode === "location" && (
        <div className={`${cardBgClass} border-l-4 border-l-[#429EBD] ${borderClass} border rounded-lg p-4 mb-4 shadow-sm`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#429EBD]/10 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#429EBD" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <p className={`font-bold ${textColor}`}>
                {language === "ar" ? "تتبع البضاعة عبر الجمهورية" : "Supply Chain Visibility (Yemen)"}
              </p>
              <p className={`text-sm ${subTextColor} mt-1`}>
                {language === "ar"
                  ? "يعرض هذا الجدول أماكن تواجد الدفعات حالياً (مخازن الشركة، الموزعين، الشاحنات، المحلات). يتم ترتيبها حسب 'الأقرب انتهاءً' لضمان سرعة الصرف."
                  : "Shows where batches are currently located (Company, Distributors, Trucks, Shops). Sorted by 'Nearest Expiry' to ensure timely dispatch."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#429EBD] text-white rounded-lg hover:bg-[#2d7a9a] transition-colors"
        >
          {t("createBatch") || "Create Batch"}
        </button>
        <input
          type="text"
          placeholder={t("searchBatches") || "Search batches..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${borderClass} ${cardBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
        />
        {viewMode === "location" && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${borderClass} ${cardBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD]`}
          >
            <option value="all">{language === "ar" ? "كل المواقع" : "All Location Types"}</option>
            <option value="warehouse">{language === "ar" ? "مخازن الشركة" : "Company Warehouses"}</option>
            <option value="company_vehicle">{language === "ar" ? "شاحنات الشركة" : "Company Trucks"}</option>
            <option value="distributor">{language === "ar" ? "مخازن الموزعين" : "Distributor Warehouses"}</option>
            <option value="distributor_vehicle">{language === "ar" ? "شاحنات الموزعين" : "Distributor Trucks"}</option>
            <option value="supermarket">{language === "ar" ? "المحلات / التجار" : "Supermarkets / Merchants"}</option>
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-blue-500`}>
          <div className={`text-sm font-medium ${subTextColor}`}>{language === "ar" ? "إجمالي الدفعات" : "Total Batches"}</div>
          <div className={`text-3xl font-bold ${textColor} mt-1`}>{filteredBatches.length}</div>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-emerald-500`}>
          <div className={`text-sm font-medium ${subTextColor}`}>{language === "ar" ? "إجمالي الهادر (كراتين)" : "Total Waste (Cartons)"}</div>
          <div className="text-3xl font-bold text-red-500 mt-1">
            {filteredBatches.reduce((acc, b) => acc + (b.wasted_cartons || 0), 0)}
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-amber-500`}>
          <div className={`text-sm font-medium ${subTextColor}`}>{language === "ar" ? "قريبة الانتهاء" : "Expiring Soon"}</div>
          <div className="text-3xl font-bold text-amber-500 mt-1">
            {filteredBatches.filter(b => (b.min_shelf_life_days || b.days_until_expiry) <= 7 && (b.min_shelf_life_days || b.days_until_expiry) > 0).length}
          </div>
        </div>
        <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-red-500`}>
          <div className={`text-sm font-medium ${subTextColor}`}>{language === "ar" ? "عالية الخطورة" : "High Risk"}</div>
          <div className="text-3xl font-bold text-red-500 mt-1">
            {filteredBatches.filter(b => (b.avg_quality_score < 0.7) || (b.min_shelf_life_days < 0)).length}
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className={`rounded-xl border-2 ${borderClass} ${cardBgClass} overflow-hidden shadow-lg`}>
        {/* Table Header */}
        <div className={`px-6 py-4 border-b ${borderClass} ${theme === "dark" ? "bg-slate-800/50" : "bg-[#E0F7FA]"}`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-bold ${textColor}`}>
              {viewMode === "fifo"
                ? (language === "ar" ? "قائمة FIFO (الأقدم أولاً)" : "FIFO List (Oldest First)")
                : viewMode === "fefo"
                  ? (language === "ar" ? "قائمة FEFO (الأقرب انتهاءً أولاً)" : "FEFO List (Earliest Expiry First)")
                  : viewMode === "location"
                    ? (language === "ar" ? "تتبع البضاعة النشطة (Supply Chain Tracking)" : "Active Supply Chain Tracking")
                    : viewMode === "expired"
                      ? (language === "ar" ? "قائمة المنتجات المنتهية (التلفيات)" : "Expired Products List (Waste)")
                      : (language === "ar" ? "جميع الدفعات" : "All Batches")
              }
            </h3>
            <span className={`text-sm ${subTextColor}`}>
              {filteredBatches.length} {language === "ar" ? "دفعة" : "batches"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === "dark" ? "bg-slate-800/30" : "bg-slate-50"}`}>
              <tr>
                {(viewMode === "fifo" || viewMode === "fefo") && (
                  <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>
                    #
                  </th>
                )}
                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "رمز الدفعة" : "Batch Code"}</th>
                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "المنتج" : "Product"}</th>
                {viewMode === "location" && (
                  <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "الموقع الحالي" : "Current Location"}</th>
                )}
                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "الكمية" : "Quantity"}</th>
                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "تاريخ الإنتاج" : "Production"}</th>
                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "الانتهاء الأصلي" : "Original Expiry"}</th>
                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "الانتهاء الفعلي" : "Actual Expiry"}</th>
                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "الوضع" : "Status/Life"}</th>
                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "حالة التلف" : "Risk (AI)"}</th>
                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "الجودة" : "Quality"}</th>
                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`px-4 py-12 text-center`}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme === "dark" ? "#64748b" : "#94a3b8"} strokeWidth="1.5" className="mx-auto mb-4">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                    <p className={`text-lg font-semibold ${subTextColor}`}>
                      {language === "ar" ? "لا توجد دفعات" : "No batches found"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch, index) => {
                  const shelfStatus = batch.shelf_life?.status;
                  const rowBorder = shelfStatus === "expired" || shelfStatus === "critical"
                    ? "border-l-4 border-l-red-500"
                    : shelfStatus === "warning"
                      ? "border-l-4 border-l-amber-500"
                      : shelfStatus === "caution"
                        ? "border-l-4 border-l-orange-500"
                        : "border-l-4 border-l-emerald-500";

                  return (
                    <tr
                      key={batch.id}
                      className={`border-t ${borderClass} ${rowBorder} transition-colors hover:${theme === "dark" ? "bg-slate-800/30" : "bg-slate-50"}`}
                    >
                      {(viewMode === "fifo" || viewMode === "fefo") && (
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${index === 0
                            ? "bg-[#429EBD] text-white"
                            : index <= 2
                              ? theme === "dark" ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
                              : theme === "dark" ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
                            }`}>
                            {index + 1}
                          </span>
                        </td>
                      )}
                      <td className={`px-4 py-4 font-mono text-sm font-semibold ${textColor}`}>
                        {batch.batch_code}
                      </td>
                      <td className={`px-4 py-4`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === "dark" ? "bg-blue-500/20" : "bg-blue-50"}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#429EBD" strokeWidth="2.5">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                          </div>
                          <span className={`font-semibold ${textColor}`}>{batch.product_name}</span>
                        </div>
                      </td>
                      {viewMode === "location" && (
                        <td className={`px-4 py-4`}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {/* Dynamic Icon based on location_type */}
                              <div className={`p-1.5 rounded ${batch.location_type === "warehouse" ? "bg-blue-500/10 text-blue-500" :
                                (batch.location_type?.includes("truck") || batch.location_type?.includes("vehicle")) ? "bg-amber-500/10 text-amber-500" :
                                  batch.location_type === "distributor" ? "bg-purple-500/10 text-purple-500" :
                                    "bg-emerald-500/10 text-emerald-500"
                                }`}>
                                {(batch.location_type?.includes("truck") || batch.location_type?.includes("vehicle")) ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="1" y="3" width="15" height="13" />
                                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                    <circle cx="5.5" cy="18.5" r="2.5" />
                                    <circle cx="18.5" cy="18.5" r="2.5" />
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                  </svg>
                                )}
                              </div>
                              <span className={`font-bold text-sm ${textColor}`}>{batch.location_name || "Unknown"}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${batch.location_type === "warehouse" ? "bg-blue-100 text-blue-700" :
                              (batch.location_type?.includes("truck") || batch.location_type?.includes("vehicle")) ? "bg-amber-100 text-amber-700" :
                                batch.location_type === "distributor" ? "bg-purple-100 text-purple-700" :
                                  "bg-emerald-100 text-emerald-700"
                              }`}>
                              {batch.location_type_name || batch.location_type}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className={`px-4 py-4`}>
                        <div className="flex flex-col">
                          <span className={`font-bold ${textColor}`}>{batch.quantity?.toLocaleString()}</span>
                          <span className={`text-[10px] ${subTextColor} uppercase`}>{batch.unit}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-4 text-xs ${subTextColor}`}>
                        {batch.production_date ? new Date(batch.production_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "-"}
                      </td>
                      <td className={`px-4 py-4 text-xs ${subTextColor} line-through opacity-60`}>
                        {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "-"}
                      </td>
                      <td className={`px-4 py-4 text-xs font-bold ${batch.actual_expiry && batch.actual_expiry !== batch.expiry_date ? "text-red-500" : textColor}`}>
                        {batch.actual_expiry
                          ? new Date(batch.actual_expiry).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")
                          : new Date(batch.expiry_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {(() => {
                          const expiry = batch.actual_expiry || batch.expiry_date;
                          const today = new Date();
                          const diffTime = new Date(expiry) - today;
                          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          const isExpired = days < 0;
                          const isWarning = days >= 0 && days <= 7;

                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isExpired ? "bg-red-500/20 text-red-500" :
                              isWarning ? "bg-amber-500/20 text-amber-500 animate-pulse" :
                                "bg-emerald-500/20 text-emerald-500"
                              }`}>
                              {isExpired ? (language === "ar" ? "منتهي" : "Expired") : `${days} ${language === "ar" ? "يوم" : "days"}`}
                            </span>
                          );
                        })()}
                      </td>
                      {/* AI Risk Status Cell */}
                      <td className="px-4 py-4 text-center">
                        {batch.ai_spoilage_status ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${batch.ai_spoilage_status === 'Good' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                            batch.ai_spoilage_status === 'Warning' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                              batch.ai_spoilage_status === 'Critical' ? 'bg-red-100 text-red-700 border-red-300' :
                                'bg-slate-800 text-white border-red-500'
                            }`}>
                            {batch.ai_spoilage_status === 'Good' ? '✓' : batch.ai_spoilage_status === 'Warning' ? '⚠' : '✗'}
                            {language === "ar" ?
                              (batch.ai_spoilage_status === 'Good' ? 'جيد' :
                                batch.ai_spoilage_status === 'Warning' ? 'تحذير' :
                                  batch.ai_spoilage_status === 'Critical' ? 'حرج' : 'منتهي')
                              : batch.ai_spoilage_status}
                          </span>
                        ) : (
                          <span className={`text-xs ${subTextColor}`}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-12 h-1.5 rounded-full ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"} overflow-hidden`}>
                            <div
                              className={`h-full rounded-full ${(batch.avg_quality_score || 1) > 0.9 ? "bg-emerald-500" :
                                (batch.avg_quality_score || 1) > 0.7 ? "bg-amber-500" : "bg-red-500"
                                }`}
                              style={{ width: `${(batch.avg_quality_score || 1) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {Math.round((batch.avg_quality_score || 1) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedBatch(batch)}
                            className={`p-2 rounded-lg transition-all hover:scale-105 ${theme === "dark"
                              ? "bg-slate-700 text-white hover:bg-slate-600"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            title={language === "ar" ? "عرض" : "View"}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {batch.status === "in_storage" && (
                            <button
                              className={`p-2 rounded-lg transition-all hover:scale-105 bg-[#429EBD] text-white hover:bg-[#2d7a9a]`}
                              title={language === "ar" ? "شحن" : "Ship"}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                              </svg>
                            </button>
                          )}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
              onClick={() => setShowCreateModal(false)}
            ></div>

            <div className={`relative transform overflow-hidden rounded-2xl ${theme === "dark" ? "bg-slate-900 border border-white/10" : "bg-white"} p-0 text-right shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg animate-scale-in flex flex-col max-h-[90vh]`}>
              {/* Modal Header */}
              <div className={`p-6 border-b ${borderClass} flex items-center justify-between`}>
                <h3 className={`text-2xl font-bold ${textColor}`}>
                  {t("createBatch") || "إنشاء دفعة جديدة"}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`text-2xl ${subTextColor} hover:${textColor} transition-colors`}
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <form id="batch-form" onSubmit={handleCreateBatch} className="space-y-4 text-right" dir={language === "ar" ? "rtl" : "ltr"}>
                  {/* Product Selection */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {t("selectProduct") || "اختر المنتج"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.product_id}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${borderClass} ${textColor} ${cardBgClass} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50 transition-all`}
                    >
                      <option value="">{language === "ar" ? "-- اختر المنتج --" : "-- Select Product --"}</option>
                      {availableProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.category})
                        </option>
                      ))}
                    </select>
                    {/* Removed: <p className={`text-xs mt-1 ${subTextColor}`}>
                    {language === "ar" ? "سيتم إنشاء رمز الدفعة وتاريخ الانتهاء تلقائياً" : "Batch code and expiry date will be generated automatically"}
                  </p> */}
                  </div>

                  {/* Selected Product Info */}
                  {formData.product_id && (
                    <div className={`p-4 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800/50" : "bg-[#E0F7FA]/50"}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme === "dark" ? "#10b981" : "#059669"} strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span className={`font-semibold ${textColor}`}>
                          {availableProducts.find(p => p.id === formData.product_id)?.name}
                        </span>
                      </div>
                      <div className={`text-sm ${subTextColor}`}>
                        {language === "ar" ? "الفئة:" : "Category:"} {availableProducts.find(p => p.id === formData.product_id)?.category}
                      </div>
                    </div>
                  )}

                  {/* Batch Code */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {t("batchCode") || "رمز الدفعة"} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={formData.batch_code}
                        onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                        /* Removed: placeholder={language === "ar" ? "سيتم إنشاؤه تلقائياً" : "Auto-generated"} */
                        className={`flex-1 px-4 py-3 rounded-lg border-2 ${borderClass} ${textColor} ${cardBgClass} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.product_id) {
                            setFormData({ ...formData, batch_code: generateBatchCode(formData.product_id) });
                          }
                        }}
                        disabled={!formData.product_id}
                        className={`px-4 py-3 rounded-lg transition-all ${formData.product_id
                          ? "bg-[#429EBD] text-white hover:bg-[#2d7a9a]"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                      /* Removed: title={language === "ar" ? "إنشاء رمز جديد" : "Generate new code"} */
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <path d="M3 21v-5h5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className={`block ${textColor} mb-2 font-medium`}>
                      {t("quantity") || "الكمية"} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        /* Removed: placeholder={t("enterQuantity") || "أدخل الكمية"} */
                        className={`flex-1 px-4 py-3 rounded-lg border-2 ${borderClass} ${textColor} ${cardBgClass} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50 transition-all`}
                      />
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className={`px-4 py-3 rounded-lg border-2 ${borderClass} ${textColor} ${cardBgClass} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50`}
                      >
                        <option value="unit">{t("unit") || "وحدة"}</option>
                        <option value="kg">{t("kg") || "كجم"}</option>
                        <option value="g">{t("g") || "جرام"}</option>
                        <option value="l">{t("liter") || "لتر"}</option>
                        <option value="ml">{t("ml") || "مل"}</option>
                      </select>
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Production Date */}
                    <div>
                      <label className={`block ${textColor} mb-2 font-medium`}>
                        {t("productionDate") || "تاريخ الإنتاج"}
                      </label>
                      <input
                        type="date"
                        value={formData.production_date}
                        onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${borderClass} ${textColor} ${cardBgClass} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50 transition-all`}
                      />
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className={`block ${textColor} mb-2 font-medium`}>
                        {t("expiryDate") || "تاريخ الانتهاء"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        /* Removed: min={formData.production_date || new Date().toISOString().split('T')[0]} */
                        className={`w-full px-4 py-3 rounded-lg border-2 ${borderClass} ${textColor} ${cardBgClass} focus:outline-none focus:ring-2 focus:ring-[#429EBD]/50 transition-all`}
                      />
                    </div>
                  </div>

                  {/* Shelf Life Preview */}
                  {formData.expiry_date && formData.production_date && (
                    <div className={`p-4 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-emerald-900/20" : "bg-emerald-50"}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${subTextColor}`}>
                          {language === "ar" ? "مدة الصلاحية:" : "Shelf Life:"}
                        </span>
                        <span className={`font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                          {Math.ceil((new Date(formData.expiry_date) - new Date(formData.production_date)) / (1000 * 60 * 60 * 24))} {language === "ar" ? "يوم" : "days"}
                        </span>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className={`p-6 border-t ${borderClass} flex gap-3`}>
                <button
                  type="submit"
                  form="batch-form"
                  disabled={creating || !formData.batch_code || !formData.product_id || !formData.quantity || !formData.expiry_date}
                  className="flex-1 px-6 py-3 bg-[#429EBD] text-white rounded-lg hover:bg-[#2d7a9a] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
                >
                  {creating ? (t("creating") || "جاري الإنشاء...") : (t("create") || "إنشاء")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      product_id: "",
                      facility_id: user?.facility_id || "",
                      batch_code: "",
                      quantity: "",
                      unit: "unit",
                      production_date: "",
                      expiry_date: "",
                      status: "in_storage",
                    });
                  }}
                  className={`px-6 py-3 rounded-lg border-2 ${borderClass} ${textColor} hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-semibold`}
                >
                  {t("cancel") || "إلغاء"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchManagement;

