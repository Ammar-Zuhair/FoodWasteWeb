import { useState, useMemo, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useBatchAllocations, useBatches, useCreateBatch, useUpdateBatch } from "../hooks/useBatches.js";
import { useQualityStats } from "../hooks/useQuality.js";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import { getStoredUser } from "../utils/api/auth.js";
import { getGovernorates } from "../utils/api/data.js";
import { analyzeBatchExpiry } from "../utils/api/batches.js"; // Import API function

function InventoryManagement({ user: propUser }) {
    const { theme } = useTheme();
    const { language, t } = useLanguage();
    const storedUser = getStoredUser();
    const user = propUser || (storedUser ? {
        id: storedUser.id,
        organization_id: storedUser.organization_id,
        role: storedUser.role,
        facility_id: storedUser.facility_id,
    } : null);

    // Fetch real data from database
    const { allocations, loading: loadingAllocations, error: allocationsError, reload: reloadAllocations } = useBatchAllocations({
        organization_id: user?.organization_id,
    });

    // Create/Update hooks
    const { create: createBatch, loading: creating } = useCreateBatch();
    const { update: updateBatch, loading: updating } = useUpdateBatch();

    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [qualityFilter, setQualityFilter] = useState("all"); // "all" | "inspected" | "not_inspected"
    const [sortBy, setSortBy] = useState("expiry"); // "expiry" | "alpha_asc" | "alpha_desc"
    const [governorateFilter, setGovernorateFilter] = useState("all");
    const [governorates, setGovernorates] = useState([]);
    const [loadingGovernorates, setLoadingGovernorates] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [analyzingIds, setAnalyzingIds] = useState(new Set()); // Track items currently being analyzed

    // Fetch governorates from database
    useEffect(() => {
        const fetchGovernorates = async () => {
            try {
                setLoadingGovernorates(true);
                const data = await getGovernorates();
                setGovernorates(Array.isArray(data) ? data : (data.governorates || []));
            } catch (error) {
                console.error("Error fetching governorates:", error);
                setGovernorates([]);
            } finally {
                setLoadingGovernorates(false);
            }
        };
        fetchGovernorates();
    }, []);

    // Form data for add/edit
    const [formData, setFormData] = useState({
        batch_code: "",
        product_name: "",
        production_date: "",
        expiry_date: "",
        storage_location: "",
        quantity: "",
        unit: "carton",
        min_stock_threshold: "50",
    });

    // Theme classes
    const textColor = theme === "dark" ? "text-white" : "text-[#053F5C]";
    const subTextColor = theme === "dark" ? "text-slate-400" : "text-[#429EBD]";
    const borderClass = theme === "dark" ? "border-white/10" : "border-[#9FE7F5]/40";
    const cardBgClass = theme === "dark" ? "bg-slate-900/80" : "bg-white/50";
    const inputBgClass = theme === "dark" ? "bg-slate-800" : "bg-white";

    // Transform API data to inventory format
    // API now returns only allocations from facilities (warehouses/factories)
    const inventoryData = useMemo(() => {
        if (!allocations || !Array.isArray(allocations)) return [];

        return allocations.map(item => ({
            id: item.id || item.batch_id,
            batch_id: item.batch_id, // Ensure batch_id is preserved
            batch_code: item.batch_code,
            product_name: item.product_name || (language === "ar" ? "منتج غير معروف" : "Unknown Product"),
            production_date: item.production_date,
            expiry_date: item.expiry_date || item.earliest_expiry_date,
            actual_expiry_date: item.expiry_date || item.earliest_expiry_date,
            // Use facility_name (branch/warehouse name from Facility table)
            // Use Arabic name if language is Arabic and available
            storage_location: language === "ar"
                ? (item.facility_name_ar || item.facility_name || item.location_name || "غير محدد")
                : (item.facility_name_en || item.facility_name || item.location_name || "Unknown"),
            location_type: item.location_type,
            facility_id: item.facility_id,
            facility_name: item.facility_name || item.location_name,
            governorate_id: item.governorate_id,
            governorate_name: language === "ar"
                ? (item.governorate_name || item.governorate)
                : (item.governorate_name_en || item.governorate_name || item.governorate),
            quantity: item.quantity || item.total_quantity || 0,
            unit: item.unit || "unit",
            min_stock_threshold: 50, // Default threshold
            is_inspected: (item.avg_quality_score || 0) > 0.5,
            quality_score: item.avg_quality_score || 1.0,
            carton_count: item.carton_count || 0,
            min_shelf_life_days: item.min_shelf_life_days,
            status: item.status,
            ai_predicted_expiry_date: item.ai_predicted_expiry_date,
            days_lost_due_to_storage: item.days_lost_due_to_storage,
            ai_spoilage_status: item.ai_spoilage_status,
            spoilage_risk_score: item.spoilage_risk_score,
            ai_quality_score: item.ai_quality_score,
            ai_food_action: item.ai_food_action,
        }));
    }, [allocations, language]);

    // Calculate status for each item
    const getItemStatus = (item) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use min_shelf_life_days if available
        if (item.min_shelf_life_days !== undefined && item.min_shelf_life_days !== null) {
            if (item.min_shelf_life_days < 0) return "expired";
            if (item.min_shelf_life_days <= 3) return "critical";
            if (item.min_shelf_life_days <= 7) return "warning";
            return "good";
        }

        // Fallback to date calculation
        const expiryDate = new Date(item.actual_expiry_date || item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        const isLowStock = item.quantity < item.min_stock_threshold;

        if (daysUntilExpiry < 0 || item.status === "expired") return "expired";
        if (daysUntilExpiry <= 3) return "critical";
        if (daysUntilExpiry <= 7 || isLowStock) return "warning";
        return "good";
    };

    const getDaysUntilExpiry = (item) => {
        if (item.min_shelf_life_days !== undefined && item.min_shelf_life_days !== null) {
            return item.min_shelf_life_days;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(item.actual_expiry_date || item.expiry_date);
        return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    };

    // Filter and sort inventory
    const filteredInventory = useMemo(() => {
        return inventoryData
            .filter(item => {
                // Search filter
                const matchesSearch =
                    (item.batch_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (item.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (item.storage_location || "").toLowerCase().includes(searchTerm.toLowerCase());

                // Quality filter (based on quality score)
                const matchesQuality =
                    qualityFilter === "all" ||
                    (qualityFilter === "inspected" && item.quality_score > 0.5) ||
                    (qualityFilter === "not_inspected" && item.quality_score <= 0.5);

                // Governorate filter - if "all" show everything, otherwise match by ID
                let matchesGovernorate = true;
                if (governorateFilter !== "all") {
                    // Check if item has governorate_id and it matches the filter
                    if (item.governorate_id !== null && item.governorate_id !== undefined) {
                        // Debug log for first item only to avoid spam
                        if (item === inventoryData[0]) {
                            console.log(`Filtering: Item GovID type: ${typeof item.governorate_id}, Value: ${item.governorate_id} | Filter type: ${typeof governorateFilter}, Value: ${governorateFilter}`);
                        }
                        matchesGovernorate = String(item.governorate_id) === String(governorateFilter);
                    } else {
                        // If no governorate_id, don't match specific filter
                        matchesGovernorate = false;
                    }
                }

                return matchesSearch && matchesQuality && matchesGovernorate;
            })
            .sort((a, b) => {
                if (sortBy === "expiry") {
                    return getDaysUntilExpiry(a) - getDaysUntilExpiry(b);
                }
                if (sortBy === "alpha_asc") {
                    return (a.product_name || "").localeCompare(b.product_name || "", language === "ar" ? "ar" : "en");
                }
                if (sortBy === "alpha_desc") {
                    return (b.product_name || "").localeCompare(a.product_name || "", language === "ar" ? "ar" : "en");
                }
                return 0;
            });
    }, [inventoryData, searchTerm, qualityFilter, governorateFilter, sortBy, language]);

    // Stats
    const stats = useMemo(() => {
        const total = inventoryData.length;
        const expired = inventoryData.filter(item => getItemStatus(item) === "expired").length;
        const nearExpiry = inventoryData.filter(item => {
            const days = getDaysUntilExpiry(item);
            return days > 0 && days <= 7;
        }).length;
        const lowStock = inventoryData.filter(item => item.quantity < item.min_stock_threshold).length;
        const inspected = inventoryData.filter(item => item.quality_score > 0.5).length;
        const notInspected = total - inspected;

        return { total, expired, nearExpiry, lowStock, inspected, notInspected };
    }, [inventoryData]);

    // Alerts
    const alerts = useMemo(() => {
        const result = [];

        // Critical expiry alerts (≤3 days)
        const criticalExpiry = inventoryData.filter(item => {
            const days = getDaysUntilExpiry(item);
            return days > 0 && days <= 3;
        });
        if (criticalExpiry.length > 0) {
            result.push({
                type: "critical",
                icon: "⏰",
                message: language === "ar"
                    ? `${criticalExpiry.length} منتجات تنتهي خلال 3 أيام!`
                    : `${criticalExpiry.length} items expiring within 3 days!`,
            });
        }

        // Low stock alerts
        const lowStockItems = inventoryData.filter(item => item.quantity < item.min_stock_threshold);
        if (lowStockItems.length > 0) {
            result.push({
                type: "warning",
                icon: "📦",
                message: language === "ar"
                    ? `${lowStockItems.length} منتجات بحاجة لإعادة طلب!`
                    : `${lowStockItems.length} items need reorder!`,
            });
        }

        // Expired items alerts
        const expiredItems = inventoryData.filter(item => getItemStatus(item) === "expired");
        if (expiredItems.length > 0) {
            result.push({
                type: "critical",
                icon: "⚠️",
                message: language === "ar"
                    ? `${expiredItems.length} منتجات منتهية الصلاحية!`
                    : `${expiredItems.length} expired products!`,
            });
        }

        return result;
    }, [inventoryData, language]);

    // Handle form changes
    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            batch_code: "",
            product_name: "",
            production_date: "",
            expiry_date: "",
            storage_location: "",
            quantity: "",
            unit: "carton",
            min_stock_threshold: "50",
        });
    };

    // Print report - Professional styled report matching web design
    const handlePrint = () => {
        const currentDate = new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const tableRows = filteredInventory.map((item) => {
            const status = getItemStatus(item);
            const daysLeft = getDaysUntilExpiry(item);
            const rowClass = status === "expired" ? "row-expired" : status === "critical" ? "row-critical" : status === "warning" ? "row-warning" : "row-good";
            const statusClass = status === "expired" ? "status-expired" : status === "critical" ? "status-critical" : status === "warning" ? "status-warning" : "status-good";
            const statusText = status === "expired" ? (language === "ar" ? "منتهي" : "Expired") : status === "critical" ? (language === "ar" ? daysLeft + " يوم" : daysLeft + "d") : status === "warning" ? (language === "ar" ? daysLeft + " يوم" : daysLeft + "d") : (language === "ar" ? "جيد" : "Good");
            const dateClass = (status === 'expired' || status === 'critical') ? 'date-expired' : '';
            return '<tr class="' + rowClass + '"><td><span class="batch-code">' + (item.batch_code || '-') + '</span></td><td><span style="font-weight:600;">' + (item.product_name || '-') + '</span></td><td>' + (item.production_date ? new Date(item.production_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : '-') + '</td><td class="' + dateClass + '">' + (item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : '-') + '</td><td>' + (item.storage_location || '-') + '</td><td>' + (item.governorate_name || (language === "ar" ? "غير محدد" : "N/A")) + '</td><td class="qty-cell">' + (item.quantity || 0).toLocaleString() + '</td><td style="text-align:center;"><span class="status-badge ' + statusClass + '">' + statusText + '</span></td></tr>';
        }).join('');

        const dir = language === 'ar' ? 'rtl' : 'ltr';
        const textAlign = language === 'ar' ? 'right' : 'left';
        const borderSide = language === 'ar' ? 'right' : 'left';

        const printContent = '<!DOCTYPE html><html dir="' + dir + '" lang="' + (language === 'ar' ? 'ar' : 'en') + '"><head><meta charset="UTF-8"><title>' + (language === "ar" ? "تقرير المخزون" : "Inventory Report") + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,Arial,sans-serif;padding:20px;direction:' + dir + ';background:#f8fafc;color:#1e293b;font-size:11px}.header{background:linear-gradient(135deg,#053F5C,#429EBD);color:white;padding:20px 25px;border-radius:16px;margin-bottom:20px}.header-top{display:flex;justify-content:space-between;align-items:center}.logo{display:flex;align-items:center;gap:15px}.logo-icon{width:55px;height:55px;background:rgba(255,255,255,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:20px}.company-name{font-size:26px;font-weight:700}.company-subtitle{font-size:12px;opacity:0.85}.report-info{text-align:' + textAlign + '}.report-badge{background:rgba(255,255,255,0.2);padding:8px 16px;border-radius:20px;font-weight:600;font-size:13px;display:inline-block;margin-bottom:8px}.report-date{font-size:11px;opacity:0.85}.stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px}.stat-card{background:white;border-radius:12px;padding:15px;text-align:center;border-bottom:4px solid #429EBD}.stat-card.warning{border-bottom-color:#f59e0b}.stat-card.danger{border-bottom-color:#ef4444}.stat-card.success{border-bottom-color:#10b981}.stat-card.orange{border-bottom-color:#f97316}.stat-value{font-size:28px;font-weight:700;color:#053F5C}.stat-value.warning{color:#f59e0b}.stat-value.danger{color:#ef4444}.stat-value.success{color:#10b981}.stat-value.orange{color:#f97316}.stat-label{font-size:11px;color:#64748b;margin-top:5px}.table-wrapper{background:white;border-radius:16px;overflow:hidden;border:2px solid rgba(66,158,189,0.2)}.table-header{background:linear-gradient(135deg,#e0f7fa,#b2ebf2);padding:16px 20px;border-bottom:2px solid rgba(66,158,189,0.3)}.table-title{font-size:16px;font-weight:700;color:#053F5C;display:flex;align-items:center;justify-content:space-between}.records-count{background:#429EBD;color:white;padding:4px 12px;border-radius:15px;font-size:12px;font-weight:600}table{width:100%;border-collapse:collapse;font-size:11px}thead{background:linear-gradient(135deg,#f1f5f9,#e2e8f0)}th{padding:14px 10px;text-align:' + textAlign + ';font-weight:700;color:#053F5C;font-size:11px;border-bottom:2px solid #e2e8f0}td{padding:12px 10px;border-bottom:1px solid #f1f5f9}tr:nth-child(even){background:#fafbfc}.row-expired{border-' + borderSide + ':4px solid #ef4444}.row-critical{border-' + borderSide + ':4px solid #f87171}.row-warning{border-' + borderSide + ':4px solid #f59e0b}.row-good{border-' + borderSide + ':4px solid #10b981}.batch-code{font-family:Consolas,monospace;font-weight:600;color:#053F5C;background:#f1f5f9;padding:4px 8px;border-radius:6px}.status-badge{display:inline-block;padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600}.status-good{background:#dcfce7;color:#166534;border:1px solid #86efac}.status-warning{background:#fef3c7;color:#92400e;border:1px solid #fcd34d}.status-critical{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}.status-expired{background:#1e293b;color:white}.qty-cell{text-align:center;font-weight:700;color:#053F5C}.date-expired{color:#ef4444;font-weight:600}.footer{margin-top:20px;padding:15px 20px;background:white;border-radius:12px;display:flex;justify-content:space-between;align-items:center}.footer-logo{display:flex;align-items:center;gap:10px;color:#64748b}.footer-icon{width:28px;height:28px;background:linear-gradient(135deg,#429EBD,#053F5C);border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold}@media print{body{background:white}}</style></head><body><div class="header"><div class="header-top"><div class="logo"><div class="logo-icon">HSA</div><div><div class="company-name">' + (language === "ar" ? "إدارة المخازن" : "Inventory Management") + '</div><div class="company-subtitle">' + (language === "ar" ? "تتبع وإدارة مخزون المنتجات" : "Track and manage product inventory") + '</div></div></div><div class="report-info"><div class="report-badge">' + (language === "ar" ? "تقرير المخزون" : "Inventory Report") + '</div><div class="report-date">' + currentDate + '</div></div></div></div><div class="stats-grid"><div class="stat-card"><div class="stat-value">' + stats.total + '</div><div class="stat-label">' + (language === "ar" ? "إجمالي الدفعات" : "Total Batches") + '</div></div><div class="stat-card warning"><div class="stat-value warning">' + stats.nearExpiry + '</div><div class="stat-label">' + (language === "ar" ? "قريب الانتهاء" : "Near Expiry") + '</div></div><div class="stat-card danger"><div class="stat-value danger">' + stats.expired + '</div><div class="stat-label">' + (language === "ar" ? "منتهي" : "Expired") + '</div></div><div class="stat-card orange"><div class="stat-value orange">' + stats.lowStock + '</div><div class="stat-label">' + (language === "ar" ? "مخزون منخفض" : "Low Stock") + '</div></div><div class="stat-card success"><div class="stat-value success">' + stats.inspected + '</div><div class="stat-label">' + (language === "ar" ? "جودة عالية" : "High Quality") + '</div></div><div class="stat-card"><div class="stat-value">' + stats.notInspected + '</div><div class="stat-label">' + (language === "ar" ? "يحتاج فحص" : "Needs Check") + '</div></div></div><div class="table-wrapper"><div class="table-header"><div class="table-title"><span>' + (language === "ar" ? "سجلات المخزون" : "Inventory Records") + '</span><span class="records-count">' + filteredInventory.length + ' ' + (language === "ar" ? "سجل" : "records") + '</span></div></div><table><thead><tr><th>' + (language === "ar" ? "رقم الدفعة" : "Batch #") + '</th><th>' + (language === "ar" ? "المنتج" : "Product") + '</th><th>' + (language === "ar" ? "تاريخ الإنتاج" : "Prod. Date") + '</th><th>' + (language === "ar" ? "تاريخ الانتهاء" : "Expiry") + '</th><th>' + (language === "ar" ? "الموقع" : "Location") + '</th><th>' + (language === "ar" ? "المحافظة" : "Governorate") + '</th><th>' + (language === "ar" ? "الكمية" : "Qty") + '</th><th>' + (language === "ar" ? "الحالة" : "Status") + '</th></tr></thead><tbody>' + tableRows + '</tbody></table></div><div class="footer"><div class="footer-logo"><div class="footer-icon">HSA</div><span>' + (language === "ar" ? "تم إنشاء التقرير بواسطة نظام إدارة المخزون الذكي" : "Generated by Smart Inventory Management System") + '</span></div><span style="color:#94a3b8;">' + (language === "ar" ? "صفحة 1 من 1" : "Page 1 of 1") + '</span></div></body></html>';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    // Status colors
    const getStatusColor = (status) => {
        switch (status) {
            case "expired": return "bg-red-500/20 text-red-500 border-red-500/30";
            case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
            case "warning": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
            default: return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
        }
    };

    const handleAnalyzeExpiry = async (batchId) => {
        try {
            setAnalyzingIds(prev => new Set(prev).add(batchId));
            const result = await analyzeBatchExpiry(batchId);
            // Reload data to show new prediction
            await reloadAllocations();
        } catch (error) {
            console.error("AI Analysis failed:", error);
            // Optionally show toast error
        } finally {
            setAnalyzingIds(prev => {
                const next = new Set(prev);
                next.delete(batchId);
                return next;
            });
        }
    };

    const getRowBorderColor = (status) => {
        switch (status) {
            case "expired": return "border-l-4 border-l-red-500";
            case "critical": return "border-l-4 border-l-red-400";
            case "warning": return "border-l-4 border-l-amber-500";
            default: return "border-l-4 border-l-emerald-500";
        }
    };

    // Loading state
    if (loadingAllocations) {
        return (
            <div className={`flex items-center justify-center min-h-[400px]`} dir={language === "ar" ? "rtl" : "ltr"}>
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#429EBD] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className={`${textColor} font-medium`}>
                        {language === "ar" ? "جاري تحميل بيانات المخزون..." : "Loading inventory data..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 sm:space-y-5 md:space-y-6 print:space-y-2`} dir={language === "ar" ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="mb-4 sm:mb-5 md:mb-8 print:mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className={`text-xl sm:text-2xl md:text-4xl font-semibold ${textColor} mb-1 sm:mb-1.5 md:mb-3`}>
                        {language === "ar" ? "إدارة المخازن" : "Inventory Management"}
                    </h2>
                    <p className={`text-xs sm:text-sm md:text-lg ${subTextColor}`}>
                        {language === "ar" ? "تتبع وإدارة مخزون المنتجات - بيانات حقيقية من قاعدة البيانات" : "Track and manage product inventory - Real database data"}
                    </p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <button
                        onClick={reloadAllocations}
                        className={`px-4 py-2.5 rounded-xl border ${borderClass} ${textColor} hover:bg-white/10 transition-all duration-200 font-medium flex items-center gap-2`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6" />
                            <path d="M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        {language === "ar" ? "تحديث" : "Refresh"}
                    </button>
                    <button
                        onClick={handlePrint}
                        className={`px-4 py-2.5 rounded-xl border ${borderClass} ${textColor} hover:bg-white/10 transition-all duration-200 font-medium flex items-center gap-2`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9V2h12v7" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        {language === "ar" ? "طباعة" : "Print"}
                    </button>
                </div>
            </div>

            {/* Error message */}
            {allocationsError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500">
                    <div className="flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="font-medium">{language === "ar" ? "خطأ في تحميل البيانات" : "Error loading data"}: {allocationsError}</span>
                    </div>
                </div>
            )}

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2">
                <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-blue-500`}>
                    <div className={`text-xs font-medium ${subTextColor}`}>{language === "ar" ? "إجمالي الدفعات" : "Total Batches"}</div>
                    <div className={`text-2xl font-bold ${textColor} mt-1`}>{stats.total}</div>
                </div>
                <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-amber-500`}>
                    <div className={`text-xs font-medium ${subTextColor}`}>{language === "ar" ? "قريب الانتهاء" : "Near Expiry"}</div>
                    <div className="text-2xl font-bold text-amber-500 mt-1">{stats.nearExpiry}</div>
                </div>
                <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-red-500`}>
                    <div className={`text-xs font-medium ${subTextColor}`}>{language === "ar" ? "منتهي" : "Expired"}</div>
                    <div className="text-2xl font-bold text-red-500 mt-1">{stats.expired}</div>
                </div>
                <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-orange-500`}>
                    <div className={`text-xs font-medium ${subTextColor}`}>{language === "ar" ? "مخزون منخفض" : "Low Stock"}</div>
                    <div className="text-2xl font-bold text-orange-500 mt-1">{stats.lowStock}</div>
                </div>
                <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-emerald-500`}>
                    <div className={`text-xs font-medium ${subTextColor}`}>{language === "ar" ? "جودة عالية" : "High Quality"}</div>
                    <div className="text-2xl font-bold text-emerald-500 mt-1">{stats.inspected}</div>
                </div>
                <div className={`p-4 rounded-xl border ${borderClass} ${cardBgClass} shadow-sm transition-all hover:shadow-md border-b-4 border-b-gray-500`}>
                    <div className={`text-xs font-medium ${subTextColor}`}>{language === "ar" ? "يحتاج فحص" : "Needs Check"}</div>
                    <div className="text-2xl font-bold text-gray-500 mt-1">{stats.notInspected}</div>
                </div>
            </div>

            {/* Alerts Panel */}
            {alerts.length > 0 && (
                <div className={`${cardBgClass} border ${borderClass} rounded-xl p-4 shadow-sm print:hidden`}>
                    <div className="flex flex-wrap gap-3">
                        {alerts.map((alert, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${alert.type === "critical"
                                    ? "bg-red-500/10 text-red-500 border border-red-500/30"
                                    : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                                    } animate-pulse`}
                            >
                                <span className="text-lg">{alert.icon}</span>
                                <span className="font-medium text-sm">{alert.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div className={`${cardBgClass} border ${borderClass} rounded-xl p-4 shadow-sm print:hidden`}>
                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <svg className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 ${subTextColor}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder={language === "ar" ? "بحث بالرمز، المنتج، الموقع..." : "Search by code, product, location..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full ${language === "ar" ? "pr-10 pl-4" : "pl-10 pr-4"} py-2.5 rounded-lg border ${borderClass} ${inputBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD] transition-all`}
                            />
                        </div>
                    </div>

                    {/* Quality Filter */}
                    <select
                        value={qualityFilter}
                        onChange={(e) => setQualityFilter(e.target.value)}
                        className={`px-4 py-2.5 rounded-lg border ${borderClass} ${inputBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD] min-w-[150px]`}
                    >
                        <option value="all">{language === "ar" ? "كل الحالات" : "All Status"}</option>
                        <option value="inspected">{language === "ar" ? "✓ جودة عالية" : "✓ High Quality"}</option>
                        <option value="not_inspected">{language === "ar" ? "✗ يحتاج فحص" : "✗ Needs Check"}</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`px-4 py-2.5 rounded-lg border ${borderClass} ${inputBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD] min-w-[150px]`}
                    >
                        <option value="expiry">{language === "ar" ? "الأقرب انتهاءً" : "Nearest Expiry"}</option>
                        <option value="alpha_asc">{language === "ar" ? "أبجدي أ-ي" : "A-Z"}</option>
                        <option value="alpha_desc">{language === "ar" ? "أبجدي ي-أ" : "Z-A"}</option>
                    </select>

                    {/* Governorate Filter */}
                    <select
                        value={governorateFilter}
                        onChange={(e) => setGovernorateFilter(e.target.value)}
                        className={`px-4 py-2.5 rounded-lg border ${borderClass} ${inputBgClass} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#429EBD] min-w-[150px]`}
                    >
                        <option value="all">{language === "ar" ? "كل المحافظات" : "All Governorates"}</option>
                        {governorates.map(gov => (
                            <option key={gov.id} value={gov.id}>
                                {language === "ar" ? (gov.name_ar || gov.name) : (gov.name_en || gov.name)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Inventory Table */}
            <div className={`rounded-xl border-2 ${borderClass} ${cardBgClass} overflow-hidden shadow-lg`}>
                <div className={`px-6 py-4 border-b ${borderClass} ${theme === "dark" ? "bg-slate-800/50" : "bg-[#E0F7FA]"} print:py-2`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`text-lg font-bold ${textColor}`}>
                            {language === "ar" ? "سجلات المخزون" : "Inventory Records"}
                            <span className={`text-sm font-normal ${subTextColor} mr-2`}>
                                ({language === "ar" ? "بيانات حقيقية" : "Real Data"})
                            </span>
                        </h3>
                        <span className={`text-sm ${subTextColor}`}>
                            {filteredInventory.length} {language === "ar" ? "سجل" : "records"}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className={`${theme === "dark" ? "bg-slate-800/30" : "bg-slate-50"}`}>
                            <tr>
                                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "رقم الدفعة" : "Batch #"}</th>
                                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "المنتج" : "Product"}</th>
                                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "تاريخ الإنتاج" : "Prod. Date"}</th>
                                <th className={`px-4 py-4 text-right ${textColor} font-bold text-sm`}>{language === "ar" ? "تاريخ الانتهاء" : "Expiry"}</th>
                                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "تاريخ الانتهاء المتوقع (AI)" : "Expected Expiry (AI)"}</th>
                                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "حالة التلف" : "Risk Status"}</th>
                                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "الجودة (AI)" : "Quality (AI)"}</th>
                                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "الموقع" : "Location"}</th>
                                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "المحافظة" : "Governorate"}</th>
                                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "الكمية" : "Qty"}</th>
                                <th className={`px-4 py-4 text-center ${textColor} font-bold text-sm`}>{language === "ar" ? "الحالة" : "Status"}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme === "dark" ? "#64748b" : "#94a3b8"} strokeWidth="1.5" className="mx-auto mb-4">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                        </svg>
                                        <p className={`text-lg font-semibold ${subTextColor}`}>
                                            {language === "ar" ? "لا توجد سجلات في قاعدة البيانات" : "No records found in database"}
                                        </p>
                                        <p className={`text-sm ${subTextColor} mt-1`}>
                                            {language === "ar" ? "تأكد من وجود بيانات دفعات في النظام" : "Make sure there are batch records in the system"}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map((item) => {
                                    const status = getItemStatus(item);
                                    const daysLeft = getDaysUntilExpiry(item);

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`border-t ${borderClass} ${getRowBorderColor(status)} transition-colors hover:${theme === "dark" ? "bg-slate-800/30" : "bg-slate-50"}`}
                                        >
                                            <td className={`px-4 py-4 font-mono text-sm font-semibold ${textColor}`}>
                                                {item.batch_code}
                                            </td>
                                            <td className={`px-4 py-4`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === "dark" ? "bg-blue-500/20" : "bg-blue-50"}`}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#429EBD" strokeWidth="2.5">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                        </svg>
                                                    </div>
                                                    <span className={`font-semibold ${textColor}`}>{item.product_name}</span>
                                                </div>
                                            </td>
                                            <td className={`px-4 py-4 text-sm ${subTextColor}`}>
                                                {item.production_date ? new Date(item.production_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "-"}
                                            </td>
                                            <td className={`px-4 py-4 text-sm font-medium ${status === "expired" || status === "critical" ? "text-red-500" : subTextColor}`}>
                                                {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "-"}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {item.ai_predicted_expiry_date ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-sm font-bold ${item.days_lost_due_to_storage > 0 ? "text-red-500" : "text-emerald-500"
                                                            }`}>
                                                            {new Date(item.ai_predicted_expiry_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                                                        </span>
                                                        {item.days_lost_due_to_storage > 0 && (
                                                            <span className="text-[10px] text-red-500 font-medium">
                                                                -{item.days_lost_due_to_storage} {language === "ar" ? "يوم" : "days"} (Lost)
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className={`text-sm font-medium ${subTextColor}`}>
                                                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US") : "-"}
                                                        <span className="block text-[10px] opacity-70">
                                                            {language === "ar" ? "(قياسي)" : "(Standard)"}
                                                        </span>
                                                    </span>
                                                )}
                                            </td>
                                            {/* Risk Status Cell */}
                                            <td className="px-4 py-4 text-center">
                                                {item.ai_spoilage_status ? (
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${item.ai_spoilage_status === 'Good' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                                        item.ai_spoilage_status === 'Warning' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                                            item.ai_spoilage_status === 'Critical' ? 'bg-red-100 text-red-700 border-red-300' :
                                                                'bg-slate-800 text-white border-red-500'
                                                        }`}>
                                                        {item.ai_spoilage_status === 'Good' ? '✓' :
                                                            item.ai_spoilage_status === 'Warning' ? '⚠' :
                                                                item.ai_spoilage_status === 'Critical' ? '⚠' : '✗'}
                                                        {language === "ar" ?
                                                            (item.ai_spoilage_status === 'Good' ? 'جيد' :
                                                                item.ai_spoilage_status === 'Warning' ? 'تحذير' :
                                                                    item.ai_spoilage_status === 'Critical' ? 'حرج' : 'منتهي')
                                                            : item.ai_spoilage_status}
                                                    </span>
                                                ) : (
                                                    <span className={`text-xs ${subTextColor}`}>—</span>
                                                )}
                                            </td>
                                            {/* Quality Score + Action Cell */}
                                            <td className="px-4 py-4 text-center">
                                                {item.ai_quality_score != null ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`font-bold text-sm ${item.ai_quality_score >= 70 ? 'text-emerald-500' :
                                                            item.ai_quality_score >= 40 ? 'text-amber-500' : 'text-red-500'
                                                            }`}>
                                                            {item.ai_quality_score.toFixed(0)}%
                                                        </span>
                                                        {item.ai_food_action && (
                                                            <span className={`text-[9px] font-medium ${item.ai_food_action === 'Good_for_Sale' ? 'text-emerald-600' :
                                                                item.ai_food_action === 'Donate_Immediate' ? 'text-blue-600' :
                                                                    item.ai_food_action === 'Recycle_Compost' ? 'text-amber-600' : 'text-red-600'
                                                                }`}>
                                                                {language === "ar" ?
                                                                    (item.ai_food_action === 'Good_for_Sale' ? 'صالح للبيع' :
                                                                        item.ai_food_action === 'Donate_Immediate' ? 'تبرع فوري' :
                                                                            item.ai_food_action === 'Recycle_Compost' ? 'إعادة تدوير' : 'إتلاف')
                                                                    : item.ai_food_action.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs ${subTextColor}`}>—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-bold text-xs ${theme === "dark" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                                                    {item.storage_location}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`text-sm ${subTextColor}`}>
                                                    {item.governorate_name || (language === "ar" ? "غير محدد" : "Unknown")}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-bold ${textColor}`}>
                                                        {(item.quantity || 0).toLocaleString()}
                                                    </span>
                                                    <span className={`text-[10px] ${subTextColor} uppercase`}>{item.unit}</span>
                                                    {item.carton_count > 0 && (
                                                        <span className="text-[9px] text-blue-500 font-medium mt-0.5">
                                                            {item.carton_count} {language === "ar" ? "كرتون" : "cartons"}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                                                    {status === "expired" ? (language === "ar" ? "منتهي" : "Expired") :
                                                        status === "critical" ? (language === "ar" ? `${daysLeft} يوم` : `${daysLeft}d`) :
                                                            status === "warning" ? (language === "ar" ? `${daysLeft} يوم` : `${daysLeft}d`) :
                                                                (language === "ar" ? "جيد" : "Good")}
                                                </span>
                                            </td>
                                        </tr>
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

export default InventoryManagement;
