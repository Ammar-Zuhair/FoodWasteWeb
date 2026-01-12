import React, { useState, useMemo } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import {
  useOrders,
  useCreateOrder,
  useUpdateOrder,
  useDistributeOrder,
  useOrderStats,
  useAllocateBatches,
  useWasteReductionStats,
} from "../hooks/useOrders.js";
import { useMerchants } from "../hooks/useMerchants.js";
import { useProducts } from "../hooks/useProducts.js";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import SearchableSelect from "../components/shared/SearchableSelect.jsx";
import { getStoredUser } from "../utils/api/auth.js";

function OrderManagement({ user: propUser }) {
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [showDateFilter, setShowDateFilter] = useState(false);

  // تاريخ افتراضي: آخر 30 يوم
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const { orders, loading, error, reload } = useOrders({
    organization_id: user?.organization_id,
    start_date: dateRange.start_date,
    end_date: dateRange.end_date + 'T23:59:59',
  });
  const { stats } = useOrderStats({
    organization_id: user?.organization_id,
  });
  const { create, loading: creating } = useCreateOrder();
  const { update, loading: updating } = useUpdateOrder();
  const { distribute, loading: distributing } = useDistributeOrder();
  const { stats: wasteStats } = useWasteReductionStats({
    organization_id: user?.organization_id,
  });

  // Form state
  const [formData, setFormData] = useState({
    facility_id: "",
    branch_id: "",
    order_date: new Date().toISOString().split('T')[0],
    requested_delivery_date: "",
    distribution_mode: "auto",
    priority: "normal", // normal, urgent
    items: [{ product_id: "", quantity: "", unit_price: "" }],
  });

  const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
  const borderClass = theme === "dark" ? "border-white/10" : "border-[#9FE7F5]/40";
  const cardBgClass = theme === "dark" ? "bg-slate-900/80" : "bg-white/50";

  // Filter orders - use real API data
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    return orders.filter((order) => {
      const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.facility?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.branch?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatus]);

  // Statistics - use real API stats or calculate from orders
  const orderStats = useMemo(() => {
    // If stats from API, extract status_counts properly
    if (stats && stats.status_counts) {
      return {
        total_orders: stats.total_orders || 0,
        pending: stats.status_counts.pending || 0,
        confirmed: stats.status_counts.confirmed || 0,
        shipped: stats.status_counts.shipped || 0,
        delivered: stats.status_counts.delivered || 0,
        cancelled: stats.status_counts.cancelled || 0,
        allocated: stats.status_counts.allocated || 0,
        urgent: 0,
        totalValue: 0,
      };
    }
    // Calculate from orders if no API stats
    if (!orders || orders.length === 0) {
      return {
        total_orders: 0,
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        urgent: 0,
        totalValue: 0,
      };
    }
    return {
      total_orders: orders.length,
      pending: orders.filter((o) => o.status === "pending" || o.status === "processing").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      urgent: orders.filter((o) => o.priority === "urgent").length,
      totalValue: orders.reduce((sum, o) => sum + (o.total_value || o.total_amount || 0), 0),
    };
  }, [orders, stats]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await create({
        organization_id: user?.organization_id,
        ...formData,
        branch_id: formData.branch_id || null,
        priority: formData.priority || "normal",
        order_date: new Date(formData.order_date).toISOString(),
        requested_delivery_date: formData.requested_delivery_date
          ? new Date(formData.requested_delivery_date).toISOString()
          : null,
        items: formData.items
          .filter((item) => item.product_id && item.quantity)
          .map((item) => ({
            product_id: item.product_id,
            quantity: parseFloat(item.quantity),
            unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
          })),
      });
      setShowCreateModal(false);
      setFormData({
        facility_id: "",
        branch_id: "",
        order_date: new Date().toISOString().split('T')[0],
        requested_delivery_date: "",
        distribution_mode: "auto",
        priority: "normal",
        items: [{ product_id: "", quantity: "", unit_price: "" }],
      });
      reload();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء إنشاء الطلب");
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await update(orderId, { status });
      reload();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء تحديث الطلب");
    }
  };

  // تأكيد وإرسال للتوزيع معاً
  const handleConfirmAndDistribute = async (orderId) => {
    try {
      await distribute(orderId, "auto");
      const msg = language === "ar"
        ? "تم تأكيد الطلب وإرساله للتوزيع بنجاح"
        : "Order confirmed and sent to distribution";
      alert(msg);
      reload();
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء التأكيد");
    }
  };



  const getStatusLabel = (status) => {
    const statusMap = {
      pending: language === "ar" ? "قيد الانتظار" : "Pending",
      processing: language === "ar" ? "قيد المعالجة" : "Processing",
      allocated: language === "ar" ? "تم تخصيص الدفعات" : "Batches Allocated",
      confirmed: language === "ar" ? "مؤكد" : "Confirmed",
      dispatched: language === "ar" ? "تم الإرسال" : "Dispatched",
      in_transit: language === "ar" ? "في الطريق" : "In Transit",
      shipped: language === "ar" ? "تم الشحن" : "Shipped",
      delivered: language === "ar" ? "تم التسليم" : "Delivered",
      partially_delivered: language === "ar" ? "تسليم جزئي" : "Partially Delivered",
      cancelled: language === "ar" ? "ملغي" : "Cancelled",
      returned: language === "ar" ? "مرتجع" : "Returned",
      expired_pre_dlv: language === "ar" ? "انتهت الصلاحية ❗" : "Expired Before Delivery",
    };
    return statusMap[status] || status;
  };

  if (loading && (!orders || orders.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className={`text-lg font-semibold ${textColor}`}>
          {language === "ar" ? "جاري تحميل بيانات الطلبات..." : "Loading orders data..."}
        </p>
      </div>
    );
  }

  // --- Inline Create Form Component -> Refactored to Modal ---
  const CreateOrderForm = () => {
    // Fetch Data for Dropdowns
    const { merchants, loading: merchantsLoading } = useMerchants();
    const { products, loading: productsLoading } = useProducts();

    // Local lookup for displaying names/details based on selection
    const getProductDetails = (productId) => {
      return products.find(p => String(p.id) === String(productId));
    };

    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto" dir={language === "ar" ? "rtl" : "ltr"}>
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setShowCreateModal(false)}
          ></div>

          <div className={`relative transform overflow-hidden rounded-2xl ${theme === "dark" ? "bg-slate-900 border border-white/10 shadow-2xl" : "bg-white shadow-2xl"} p-0 text-right transition-all sm:my-8 sm:w-full sm:max-w-4xl animate-scale-in flex flex-col max-h-[90vh]`}>
            {/* Header */}
            <div className={`p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between`}>
              <h3 className={`text-2xl font-bold ${textColor}`}>
                {language === "ar" ? "إضافة طلب جديد" : "New Order"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={`text-2xl ${subTextColor} hover:${textColor} transition-colors`}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <form id="create-order-form" onSubmit={handleCreateOrder} className="space-y-6">
                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Merchant Selection */}
                  <div className="lg:col-span-1">
                    <SearchableSelect
                      label={language === "ar" ? "السوبر ماركت" : "Supermarket"}
                      items={merchants}
                      value={formData.facility_id}
                      onChange={(val) => setFormData({ ...formData, facility_id: val })}
                      displayKey={language === "ar" ? "name_ar" : "name"}
                      valueKey="id"
                      placeholder={language === "ar" ? "ابحث عن عميل..." : "Search merchant..."}
                      loading={merchantsLoading}
                      required
                      className="w-full"
                    />
                  </div>

                  {/* Dates & Priority */}
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "تاريخ الطلب" : "Order Date"}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-gray-50"} border-2 border-gray-200 dark:border-gray-700 ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "تاريخ التسليم" : "Delivery Date"}
                    </label>
                    <input
                      type="date"
                      value={formData.requested_delivery_date}
                      onChange={(e) => setFormData({ ...formData, requested_delivery_date: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-gray-50"} border-2 border-gray-200 dark:border-gray-700 ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "الأولوية" : "Priority"}
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className={`w-full px-4 py-2 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-gray-50"} border-2 border-gray-200 dark:border-gray-700 ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="normal">{language === "ar" ? "عادي" : "Normal"}</option>
                      <option value="urgent">{language === "ar" ? "عاجل" : "Urgent"}</option>
                    </select>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-4`}>
                    {language === "ar" ? "عناصر الطلب" : "Order Items"}
                  </label>
                  <div className="space-y-4">
                    {formData.items.map((item, index) => {
                      const productDetail = getProductDetails(item.product_id);
                      return (
                        <div key={index} className={`p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 ${theme === "dark" ? "bg-slate-800/50" : "bg-gray-50/50"} grid grid-cols-1 md:grid-cols-12 gap-4 items-end transition-all hover:border-blue-500/30`}>

                          {/* Product Search */}
                          <div className="md:col-span-4">
                            <SearchableSelect
                              label={index === 0 ? (language === "ar" ? "المنتج" : "Product") : ""}
                              items={products}
                              value={item.product_id}
                              onChange={(val) => {
                                const newItems = [...formData.items];
                                newItems[index].product_id = val;
                                setFormData({ ...formData, items: newItems });
                              }}
                              displayKey={language === "ar" ? "name_ar" : "name"}
                              valueKey="id"
                              placeholder={language === "ar" ? "ابحث عن منتج..." : "Search product..."}
                              loading={productsLoading}
                              required
                            />
                          </div>

                          {/* Product Name (Read Only) */}
                          <div className="md:col-span-3">
                            <label className={`block text-xs font-semibold ${subTextColor} mb-1`}>
                              {index === 0 ? (language === "ar" ? "اسم المنتج" : "Product Name") : ""}
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={productDetail ? (language === "ar" ? productDetail.name_ar : (productDetail.name || productDetail.name_en)) : ""}
                              placeholder="-"
                              className={`w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent ${textColor} opacity-70 cursor-not-allowed`}
                            />
                          </div>

                          {/* Product ID */}
                          <div className="md:col-span-1">
                            <label className={`block text-xs font-semibold ${subTextColor} mb-1`}>
                              {index === 0 ? "ID" : ""}
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={item.product_id || ""}
                              className={`w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent ${textColor} opacity-70 cursor-not-allowed text-center`}
                            />
                          </div>

                          {/* Quantity */}
                          <div className="md:col-span-2">
                            <label className={`block text-xs font-semibold ${subTextColor} mb-1`}>
                              {index === 0 ? (language === "ar" ? "الكمية" : "Qty") : ""}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[index].quantity = e.target.value;
                                setFormData({ ...formData, items: newItems });
                              }}
                              className={`w-full px-4 py-2 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-white"} border-2 border-gray-200 dark:border-gray-700 ${textColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                          </div>

                          {/* Delete Button */}
                          <div className="md:col-span-2">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    items: formData.items.filter((_, i) => i !== index),
                                  });
                                }}
                                className={`w-full px-3 py-2 rounded-xl font-semibold transition-colors ${theme === "dark"
                                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                  : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                  } flex items-center justify-center gap-2`}
                              >
                                <span>🗑️</span> {language === "ar" ? "حذف" : "Del"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: [...formData.items, { product_id: "", quantity: "", unit_price: "" }],
                      });
                    }}
                    className={`mt-4 px-4 py-2 rounded-xl font-semibold transition-colors border-2 border-dashed ${theme === "dark"
                      ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-50"
                      }`}
                  >
                    {language === "ar" ? "+ إضافة منتج آخر" : "+ Add Another Product"}
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4`}>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                }}
                className={`flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 ${textColor} hover:bg-gray-100 dark:hover:bg-slate-800 transition-all font-bold`}
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                form="create-order-form"
                disabled={creating}
                className={`flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {creating
                  ? (language === "ar" ? "جاري الحفظ..." : "Saving...")
                  : (language === "ar" ? "حفظ الطلب" : "Save Order")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-8 animate-slide-in">
        <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-4xl font-semibold ${textColor} mb-3 leading-tight tracking-tight`}>
              {t("orderManagement") || "إدارة الطلبات"}
            </h2>
            <p className={`text-lg ${subTextColor} leading-relaxed font-normal`}>
              {language === "ar"
                ? "إدارة الطلبات والتوزيع الذكي"
                : "Manage orders and smart distribution"}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${theme === "dark"
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-[#429EBD] hover:bg-[#053F5C] text-white"
              } shadow-lg hover:shadow-xl`}
          >
            {language === "ar" ? "+ طلب جديد" : "+ New Order"}
          </button>
        </div>
      </div>

      {/* Create Order Form (Inline) */}
      {showCreateModal && <CreateOrderForm />}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "إجمالي الطلبات" : "Total Orders"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`}>
            {orderStats.total_orders}
          </div>
        </div>
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "قيد الانتظار" : "Pending"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`}>
            {orderStats.pending}
          </div>
        </div>
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "مؤكد" : "Confirmed"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`} style={{ color: "#10b981" }}>
            {orderStats.confirmed}
          </div>
        </div>
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "تم الشحن" : "Shipped"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`} style={{ color: "#3b82f6" }}>
            {orderStats.shipped}
          </div>
        </div>
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass}`}>
          <div className={`text-sm ${subTextColor} mb-2`}>
            {language === "ar" ? "تم التسليم" : "Delivered"}
          </div>
          <div className={`text-3xl font-bold ${textColor}`} style={{ color: "#10b981" }}>
            {orderStats.delivered}
          </div>
        </div>
      </div>

      {/* Waste Reduction Statistics Panel */}
      {wasteStats && (
        <div className={`${cardBgClass} rounded-xl p-6 border ${borderClass} mb-6`}>
          <h3 className={`text-xl font-semibold ${textColor} mb-4 flex items-center gap-2`}>
            🎯 {language === "ar" ? "إحصائيات تقليل الهدر" : "Waste Reduction Stats"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* FEFO Efficiency */}
            <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-purple-500/10" : "bg-purple-50"}`}>
              <div className={`text-sm ${subTextColor} mb-1`}>
                {language === "ar" ? "فعالية FEFO" : "FEFO Efficiency"}
              </div>
              <div className="text-2xl font-bold" style={{ color: "#a855f7" }}>
                {wasteStats.fefo_efficiency_percentage || 0}%
              </div>
              <div className={`text-xs ${subTextColor}`}>
                {language === "ar" ? "دفعات قريبة الانتهاء تم تصريفها" : "Near-expiry batches used"}
              </div>
            </div>

            {/* Average Days to Expiry */}
            <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-blue-500/10" : "bg-blue-50"}`}>
              <div className={`text-sm ${subTextColor} mb-1`}>
                {language === "ar" ? "متوسط الصلاحية" : "Avg Days to Expiry"}
              </div>
              <div className="text-2xl font-bold" style={{ color: "#3b82f6" }}>
                {wasteStats.avg_days_to_expiry_at_allocation || 0}
              </div>
              <div className={`text-xs ${subTextColor}`}>
                {language === "ar" ? "يوم عند التخصيص" : "days at allocation"}
              </div>
            </div>

            {/* Near Expiry Allocations */}
            <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-amber-500/10" : "bg-amber-50"}`}>
              <div className={`text-sm ${subTextColor} mb-1`}>
                {language === "ar" ? "دفعات قريبة الانتهاء" : "Near Expiry Batches"}
              </div>
              <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
                {wasteStats.near_expiry_allocations || 0}
              </div>
              <div className={`text-xs ${subTextColor}`}>
                {language === "ar" ? `${wasteStats.near_expiry_percentage?.toFixed(1) || 0}% من الإجمالي` : `${wasteStats.near_expiry_percentage?.toFixed(1) || 0}% of total`}
              </div>
            </div>

            {/* Expired Before Delivery */}
            <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-red-500/10" : "bg-red-50"}`}>
              <div className={`text-sm ${subTextColor} mb-1`}>
                {language === "ar" ? "انتهت قبل التسليم" : "Expired Before Delivery"}
              </div>
              <div className="text-2xl font-bold" style={{ color: "#ef4444" }}>
                {wasteStats.expired_before_delivery || 0}
              </div>
              <div className={`text-xs ${subTextColor}`}>
                {language === "ar" ? "طلبات" : "orders"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${cardBgClass} rounded-xl p-4 border ${borderClass} space-y-4`}>
        {/* Date Range Filter */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={subTextColor}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className={`font-semibold text-sm ${textColor}`}>
                {language === "ar" ? "فلترة حسب التاريخ" : "Filter by Date"}
              </span>
            </div>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`p-2 rounded-lg ${theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"} transition-all`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showDateFilter ? 'rotate-180' : ''} ${subTextColor}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* Quick Date Buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: language === "ar" ? "اليوم" : "Today", days: 0 },
              { label: language === "ar" ? "آخر 7 أيام" : "Last 7 days", days: 7 },
              { label: language === "ar" ? "آخر 30 يوم" : "Last 30 days", days: 30 },
              { label: language === "ar" ? "آخر 90 يوم" : "Last 90 days", days: 90 },
              { label: language === "ar" ? "الكل" : "All", days: 365 },
            ].map((option) => (
              <button
                key={option.days}
                onClick={() => {
                  const today = new Date();
                  const startDate = new Date(today);
                  startDate.setDate(startDate.getDate() - option.days);
                  setDateRange({
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: today.toISOString().split('T')[0],
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${theme === "dark"
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {showDateFilter && (
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className={`block text-xs font-semibold ${subTextColor} mb-1`}>
                  {language === "ar" ? "من تاريخ" : "From"}
                </label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"} focus:ring-2 focus:ring-[#429EBD] outline-none`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold ${subTextColor} mb-1`}>
                  {language === "ar" ? "إلى تاريخ" : "To"}
                </label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800 text-white" : "bg-white text-[#053F5C]"} focus:ring-2 focus:ring-[#429EBD] outline-none`}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className={`text-xs ${subTextColor}`}>
                  📅 {language === "ar"
                    ? `عرض الطلبات من ${dateRange.start_date} إلى ${dateRange.end_date}`
                    : `Showing orders from ${dateRange.start_date} to ${dateRange.end_date}`
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Search and Status Filter */}
        <div className="flex gap-4 items-center">
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
            <option value="pending">{language === "ar" ? "قيد الانتظار" : "Pending"}</option>
            <option value="allocated">{language === "ar" ? "تم تخصيص الدفعات" : "Allocated"}</option>
            <option value="confirmed">{language === "ar" ? "مؤكد" : "Confirmed"}</option>
            <option value="dispatched">{language === "ar" ? "تم الإرسال" : "Dispatched"}</option>
            <option value="in_transit">{language === "ar" ? "في الطريق" : "In Transit"}</option>
            <option value="shipped">{language === "ar" ? "تم الشحن" : "Shipped"}</option>
            <option value="delivered">{language === "ar" ? "تم التسليم" : "Delivered"}</option>
            <option value="partially_delivered">{language === "ar" ? "تسليم جزئي" : "Partially Delivered"}</option>
            <option value="returned">{language === "ar" ? "مرتجع" : "Returned"}</option>
            <option value="expired_pre_dlv">{language === "ar" ? "انتهت الصلاحية" : "Expired"}</option>
            <option value="cancelled">{language === "ar" ? "ملغي" : "Cancelled"}</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className={`${cardBgClass} rounded-xl border ${borderClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${theme === "dark" ? "bg-slate-800" : "bg-slate-50"}`}>
              <tr>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "رقم الطلب" : "Order Number"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "السوبر ماركت" : "Supermarket"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "تاريخ الطلب" : "Order Date"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "عدد العناصر" : "Items"}
                </th>
                <th className={`px-6 py-4 text-right ${textColor} font-semibold`}>
                  {language === "ar" ? "الأولوية" : "Priority"}
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className={`px-6 py-8 text-center ${subTextColor}`}>
                    {language === "ar" ? "لا توجد طلبات" : "No orders found"}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const getPriorityLabel = (priority) => {
                    if (priority === "urgent") {
                      return language === "ar" ? "عاجل" : "Urgent";
                    }
                    return language === "ar" ? "عادي" : "Normal";
                  };

                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className={`border-t ${borderClass} cursor-pointer hover:${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50/50"} transition-colors ${isExpanded ? (theme === "dark" ? "bg-slate-800/80" : "bg-slate-100") : ""}`}
                      >
                        <td className={`px-6 py-4 ${textColor} font-semibold`}>
                          <div className="flex items-center gap-2">
                            <span className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                            {order.order_number}
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          {order.facility?.name || "-"}
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          {new Date(order.order_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                        </td>
                        <td className={`px-6 py-4 ${textColor}`}>
                          {order.items?.length || 0}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${order.priority === "urgent"
                            ? theme === "dark"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-red-100 text-red-700"
                            : theme === "dark"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-blue-100 text-blue-700"
                            }`}>
                            {getPriorityLabel(order.priority || "normal")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={getStatusLabel(order.status)} />
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 flex-nowrap overflow-x-auto no-scrollbar items-center">

                            {/* أزرار حسب الحالة */}
                            {order.status === "pending" && (
                              <>
                                {/* تخصيص FEFO أولاً */}

                                {/* تأكيد وإرسال للتوزيع */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleConfirmAndDistribute(order.id); }}
                                  disabled={distributing}
                                  className={`whitespace-nowrap px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    } ${distributing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  ✅ {language === "ar" ? "تأكيد وتوزيع" : "Confirm"}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, "cancelled"); }}
                                  className={`whitespace-nowrap px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-red-50 text-red-700 hover:bg-red-100"
                                    }`}
                                >
                                  ❌ {language === "ar" ? "إلغاء" : "Cancel"}
                                </button>
                              </>
                            )}

                            {order.status === "processing" && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleConfirmAndDistribute(order.id); }}
                                  disabled={distributing}
                                  className={`whitespace-nowrap px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    } ${distributing ? 'opacity-50' : ''}`}
                                >
                                  ✅ {language === "ar" ? "تأكيد وتوزيع" : "Confirm"}
                                </button>
                              </>
                            )}

                            {(order.status === "confirmed" || order.status === "allocated") && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, "shipped"); }}
                                  className={`whitespace-nowrap px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                                    ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    }`}
                                >
                                  🚚 {language === "ar" ? "شحن" : "Ship"}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, "cancelled"); }}
                                  className={`whitespace-nowrap px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-red-50 text-red-700 hover:bg-red-100"
                                    }`}
                                >
                                  ❌ {language === "ar" ? "إلغاء" : "Cancel"}
                                </button>
                              </>
                            )}

                            {order.status === "shipped" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, "delivered"); }}
                                className={`whitespace-nowrap px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${theme === "dark"
                                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                  : "bg-green-50 text-green-700 hover:bg-green-100"
                                  }`}
                              >
                                🏁 {language === "ar" ? "تسليم" : "Deliver"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* تفاصيل منسدلة */}
                      {isExpanded && (
                        <tr className={`${theme === "dark" ? "bg-slate-800/30" : "bg-slate-50"}`}>
                          <td colSpan="7" className="p-4">
                            <div className={`rounded-xl border ${borderClass} p-4 ${theme === "dark" ? "bg-slate-900/50" : "bg-white/80"}`}>
                              <h4 className={`font-bold ${textColor} mb-3 flex items-center gap-2`}>
                                📦 {language === "ar" ? "المنتجات المطلوبة" : "Requested Products"}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {order.items?.map((item, idx) => (
                                  <div key={item.id || idx} className={`p-3 rounded-lg border ${borderClass} ${theme === "dark" ? "bg-slate-800" : "bg-white"}`}>
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className={`font-semibold ${textColor}`}>{item.product_name || `Product ${idx + 1}`}</div>
                                        <div className={`text-sm ${subTextColor} mt-1`}>
                                          {language === "ar" ? "الكمية:" : "Qty:"} <span className="font-bold text-lg text-emerald-500">{item.quantity}</span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className={`font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                                          {item.unit_price > 0 ? `${(item.quantity * item.unit_price).toFixed(0)} ${language === "ar" ? "ريال" : "YER"}` : ""}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className={`mt-4 pt-4 border-t ${borderClass} flex justify-between items-center`}>
                                <div>
                                  <span className={`text-sm ${subTextColor}`}>{language === "ar" ? "تاريخ التسليم:" : "Delivery Date:"} </span>
                                  <span className={`font-semibold ${textColor}`}>{order.requested_delivery_date ? new Date(order.requested_delivery_date).toLocaleDateString() : "-"}</span>
                                </div>
                                <div className={`text-lg font-bold ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}>
                                  {language === "ar" ? "الإجمالي:" : "Total:"} {order.total_amount?.toFixed(0) || 0} {language === "ar" ? "ريال" : "YER"}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default OrderManagement;

