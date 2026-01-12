
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import StatusBadge from "../components/shared/StatusBadge.jsx";
import {
  getUsers as getUsersAPI,
  createUser as createUserAPI,
  updateUser as updateUserAPI,
  deleteUser as deleteUserAPI,
  getUserStats,
  getUserLookups
} from "../utils/api/users.js";

function UserManagement({ user: propUser }) {
  const { theme } = useTheme();
  const { language } = useLanguage();

  const user = propUser || JSON.parse(localStorage.getItem("user"));

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    role_counts: {}
  });

  const initialFormState = {
    username: "",
    email: "",
    phone: "",
    password: "",
    full_name: "",
    role: "",
    department: "",
    facility_id: "",
    merchant_id: "",
    branch_id: "",
    is_active: true,
  };
  const [formData, setFormData] = useState(initialFormState);

  const [lookups, setLookups] = useState({
    roles: [],
    facilities: [],
    merchants: [],
    departments: []
  });
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [user?.organization_id]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchStats(),
      fetchLookups()
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsersAPI({ organization_id: user?.organization_id });
      const userList = Array.isArray(data) ? data : (data.users || []);
      setUsers(userList);
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(language === "ar" ? "فشل تحميل المستخدمين" : "Failed to load users");
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getUserStats({ organization_id: user?.organization_id });
      setStats(data || { total_users: 0, active_users: 0, inactive_users: 0, role_counts: {} });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      const data = await getUserLookups(user?.organization_id);
      setLookups({
        roles: data.roles || [],
        facilities: data.facilities || [],
        merchants: data.merchants || [],
        departments: data.departments || []
      });
    } catch (err) {
      console.error("Error fetching lookups:", err);
    } finally {
      setLoadingLookups(false);
    }
  };

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username || "",
        email: editingUser.email || "",
        phone: editingUser.phone || "",
        full_name: editingUser.full_name || "",
        role: editingUser.role || "",
        department: editingUser.department || "",
        facility_id: editingUser.facility_id || "",
        merchant_id: editingUser.merchant_id || "",
        branch_id: editingUser.branch_id || "",
        is_active: editingUser.is_active ?? true,
        password: "",
      });
    } else {
      setFormData(initialFormState);
    }
  }, [editingUser]);

  const rolesMap = useMemo(() => {
    const map = {};
    lookups.roles.forEach(r => {
      map[r.code] = language === "ar" ? r.name_ar : r.name_en;
    });
    return map;
  }, [lookups.roles, language]);

  const getRoleLabel = (roleCode) => rolesMap[roleCode] || roleCode || "-";

  const getRoleColor = (roleCode) => {
    const colors = {
      admin: "from-cyan-500 to-blue-600",
      manager: "from-blue-500 to-cyan-600",
      staff: "from-emerald-500 to-teal-600",
      driver: "from-orange-500 to-amber-600",
      supermarket: "from-teal-500 to-cyan-600",
      customer: "from-teal-500 to-cyan-600",
    };
    return colors[roleCode?.toLowerCase()] || "from-slate-500 to-slate-600";
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === "all" || u.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUserAPI({
        ...formData,
        organization_id: user?.organization_id,
      });
      setShowAddModal(false);
      setFormData(initialFormState);
      loadAllData();
    } catch (err) {
      alert(err.message || (language === "ar" ? "فشل إنشاء المستخدم" : "Failed to create user"));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      await updateUserAPI(editingUser.id, payload);
      setEditingUser(null);
      setShowAddModal(false);
      loadAllData();
    } catch (err) {
      alert(err.message || (language === "ar" ? "فشل تحديث المستخدم" : "Failed to update user"));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUserAPI(deletingUser.id);
      setShowDeleteModal(false);
      setDeletingUser(null);
      loadAllData();
    } catch (err) {
      alert(err.message || (language === "ar" ? "فشل حذف المستخدم" : "Failed to delete user"));
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await updateUserAPI(userId, { is_active: !currentStatus });
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error("Error toggling user status:", err);
    }
  };

  const openDeleteModal = (userItem) => {
    setDeletingUser(userItem);
    setShowDeleteModal(true);
  };

  // Premium Styles with Cyan Theme
  const textColor = theme === "dark" ? "text-white" : "text-slate-800";
  const subTextColor = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const borderClass = theme === "dark" ? "border-white/10" : "border-slate-200";
  const cardBgClass = theme === "dark"
    ? "bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl"
    : "bg-gradient-to-br from-white/90 to-slate-50/90 backdrop-blur-xl";
  const inputClass = `w-full px-4 py-3 rounded-xl border ${borderClass} ${theme === "dark" ? "bg-slate-800/50 text-white placeholder-slate-500" : "bg-white text-slate-800 placeholder-slate-400"} focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-300`;

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
          <p className={`text-xl font-medium ${textColor}`}>
            {language === "ar" ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2" dir={language === "ar" ? "rtl" : "ltr"}>

      {/* Premium Header with Cyan Theme */}
      <div className="relative overflow-hidden rounded-3xl p-8" style={{
        background: theme === "dark"
          ? "linear-gradient(135deg, #0c4a6e 0%, #0f172a 50%, #164e63 100%)"
          : "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #cffafe 100%)"
      }}>
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h1 className={`text-3xl md:text-4xl font-bold ${textColor}`}>
                  {language === "ar" ? "إدارة المستخدمين" : "User Management"}
                </h1>
              </div>
            </div>
            <p className={`text-lg ${subTextColor} max-w-xl`}>
              {language === "ar"
                ? "إدارة صلاحيات الفريق وحسابات المستخدمين بكل سهولة"
                : "Manage team permissions and user accounts with ease"}
            </p>
          </div>

          <button
            onClick={() => {
              setFormData(initialFormState);
              setEditingUser(null);
              setShowAddModal(true);
            }}
            className="group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white rounded-2xl font-bold shadow-xl shadow-cyan-500/25 hover:shadow-2xl hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300"
          >
            <div className="p-1 bg-white/20 rounded-lg group-hover:rotate-90 transition-transform duration-300">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            {language === "ar" ? "إضافة مستخدم جديد" : "Add New User"}
          </button>
        </div>
      </div>

      {/* Stats Cards - Glass Morphism with Cyan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: language === "ar" ? "إجمالي المستخدمين" : "Total Users",
            value: stats.total_users,
            gradient: "from-slate-600 to-slate-700",
            iconBg: "from-slate-500/20 to-slate-600/20",
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )
          },
          {
            label: language === "ar" ? "نشط" : "Active",
            value: stats.active_users,
            gradient: "from-emerald-500 to-teal-600",
            iconBg: "from-emerald-500/20 to-teal-500/20",
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )
          },
          {
            label: language === "ar" ? "غير نشط" : "Inactive",
            value: stats.inactive_users,
            gradient: "from-red-500 to-rose-600",
            iconBg: "from-red-500/20 to-rose-500/20",
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            )
          },
          {
            label: language === "ar" ? "المدراء" : "Admins",
            value: stats.role_counts?.admin || 0,
            gradient: "from-cyan-500 to-blue-600",
            iconBg: "from-cyan-500/20 to-blue-500/20",
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            )
          },
        ].map((stat, index) => (
          <div
            key={index}
            className={`relative overflow-hidden p-6 rounded-2xl border ${borderClass} ${cardBgClass} hover:scale-105 transition-all duration-300 group cursor-default`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.iconBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
                <p className={`text-sm ${subTextColor} mt-1 font-medium`}>{stat.label}</p>
              </div>
              <div className={`${subTextColor} opacity-60 group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className={`p-5 rounded-2xl border ${borderClass} ${cardBgClass} shadow-lg`}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <div className={`absolute top-1/2 ${language === "ar" ? "right-4" : "left-4"} transform -translate-y-1/2`}>
              <svg className={subTextColor} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={language === "ar" ? "ابحث عن مستخدم..." : "Search users..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClass} ${language === "ar" ? "pr-14" : "pl-14"}`}
            />
          </div>

          <div className="relative min-w-[200px]">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={inputClass}
            >
              <option value="all">{language === "ar" ? "جميع الأدوار" : "All Roles"}</option>
              {lookups.roles.map(role => (
                <option key={role.id} value={role.code}>
                  {language === "ar" ? role.name_ar : role.name_en}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className={`col-span-full text-center py-20 ${cardBgClass} rounded-2xl border ${borderClass}`}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`mx-auto mb-4 ${subTextColor} opacity-50`}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="17" y1="11" x2="23" y2="11" />
            </svg>
            <p className={`text-xl ${subTextColor}`}>
              {language === "ar" ? "لا يوجد مستخدمين" : "No users found"}
            </p>
          </div>
        ) : (
          filteredUsers.map((userItem) => (
            <div
              key={userItem.id}
              className={`group relative overflow-hidden p-6 rounded-2xl border ${borderClass} ${cardBgClass} hover:shadow-2xl hover:shadow-cyan-500/10 hover:border-cyan-500/30 transition-all duration-500`}
            >
              {/* Status Indicator */}
              <div className={`absolute top-4 ${language === "ar" ? "left-4" : "right-4"}`}>
                <div className={`w-3 h-3 rounded-full ${userItem.is_active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
              </div>

              {/* User Avatar & Info */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${getRoleColor(userItem.role)} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                  {userItem.full_name?.charAt(0).toUpperCase() || "U"}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${userItem.is_active ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-bold ${textColor} truncate`}>{userItem.full_name}</h3>
                  <p className={`text-sm ${subTextColor} truncate`}>@{userItem.username}</p>
                  {userItem.email && (
                    <p className={`text-xs ${subTextColor} truncate mt-1`}>{userItem.email}</p>
                  )}
                </div>
              </div>

              {/* Role Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${getRoleColor(userItem.role)} shadow-sm`}>
                  {getRoleLabel(userItem.role)}
                </span>
                {userItem.department && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${theme === "dark" ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"} mr-2`}>
                    {userItem.department}
                  </span>
                )}
              </div>

              {/* Link Info */}
              {(userItem.merchant_name || userItem.facility_name) && (
                <div className={`mb-4 p-3 rounded-xl ${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"}`}>
                  <p className={`text-xs ${subTextColor} mb-1`}>
                    {language === "ar" ? "مرتبط بـ" : "Linked to"}
                  </p>
                  <p className={`text-sm font-medium ${textColor}`}>
                    {userItem.merchant_name || userItem.facility_name}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setEditingUser(userItem);
                    setShowAddModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 font-medium transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                  {language === "ar" ? "تعديل" : "Edit"}
                </button>
                <button
                  onClick={() => handleToggleStatus(userItem.id, userItem.is_active)}
                  className={`p-2.5 rounded-xl transition-all ${userItem.is_active
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                  title={userItem.is_active ? (language === "ar" ? "تعطيل" : "Disable") : (language === "ar" ? "تفعيل" : "Enable")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={() => openDeleteModal(userItem)}
                  className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
                  title={language === "ar" ? "حذف" : "Delete"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setShowAddModal(false)}
            ></div>

            <div className={`relative w-full max-w-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} rounded-3xl shadow-2xl overflow-hidden`}>
              {/* Modal Header with Cyan Gradient */}
              <div className="relative overflow-hidden p-6 pb-4" style={{
                background: theme === "dark"
                  ? "linear-gradient(135deg, #0c4a6e 0%, #0f172a 100%)"
                  : "linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)"
              }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-white">
                    {editingUser
                      ? (language === "ar" ? "تعديل المستخدم" : "Edit User")
                      : (language === "ar" ? "إضافة مستخدم جديد" : "New User")
                    }
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="p-6 space-y-5">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "اسم المستخدم" : "Username"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingUser}
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className={`${inputClass} ${editingUser ? "opacity-60" : ""}`}
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "الاسم الكامل" : "Full Name"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "رقم الهاتف" : "Phone"}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass}
                      dir="ltr"
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div>
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {language === "ar" ? "كلمة المرور" : "Password"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                )}

                <div className={`h-px ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}`}></div>

                <div>
                  <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                    {language === "ar" ? "الدور الوظيفي" : "Role"} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    disabled={loadingLookups}
                    className={inputClass}
                  >
                    <option value="">{language === "ar" ? "اختر الدور" : "Select Role"}</option>
                    {lookups.roles.map((role) => (
                      <option key={role.id} value={role.code}>
                        {language === "ar" ? role.name_ar : role.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.role && formData.role !== "admin" && (
                  <div className="animate-fade-in">
                    <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                      {["supermarket", "customer", "merchant"].some(r => formData.role.toLowerCase().includes(r))
                        ? (language === "ar" ? "العميل / السوبرماركت" : "Customer / Supermarket")
                        : (language === "ar" ? "المنشأة / الفرع" : "Facility / Branch")
                      } <span className="text-red-500">*</span>
                    </label>

                    {["supermarket", "customer", "merchant"].some(r => formData.role.toLowerCase().includes(r)) ? (
                      <select
                        required
                        value={formData.merchant_id || ""}
                        onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value, facility_id: "" })}
                        className={inputClass}
                      >
                        <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                        {lookups.merchants.map((m) => (
                          <option key={m.id} value={m.id}>{language === "ar" ? m.name_ar || m.name : m.name_en || m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        required
                        value={formData.facility_id || ""}
                        onChange={(e) => setFormData({ ...formData, facility_id: e.target.value, merchant_id: "" })}
                        className={inputClass}
                      >
                        <option value="">{language === "ar" ? "اختر..." : "Select..."}</option>
                        {lookups.facilities.map((f) => (
                          <option key={f.id} value={f.id}>{language === "ar" ? f.name_ar || f.name : f.name_en || f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className={`flex items-center gap-3 p-4 rounded-xl ${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"}`}>
                  <input
                    type="checkbox"
                    id="is_active_check"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="is_active_check" className={`${textColor} font-medium`}>
                    {language === "ar" ? "حساب نشط" : "Active Account"}
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 px-6 py-3.5 rounded-xl border-2 ${borderClass} ${textColor} hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all`}
                  >
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={creating || updating}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-cyan-500/25 disabled:opacity-50 transition-all"
                  >
                    {creating || updating
                      ? (language === "ar" ? "جاري الحفظ..." : "Saving...")
                      : (language === "ar" ? "حفظ" : "Save")
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingUser && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setShowDeleteModal(false)}
            ></div>

            <div className={`relative w-full max-w-md ${theme === "dark" ? "bg-slate-900" : "bg-white"} rounded-3xl shadow-2xl overflow-hidden`}>
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className={`text-2xl font-bold ${textColor} mb-3`}>
                  {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                </h3>
                <p className={`${subTextColor} mb-6`}>
                  {language === "ar"
                    ? `هل أنت متأكد من حذف المستخدم "${deletingUser.full_name}"؟`
                    : `Are you sure you want to delete "${deletingUser.full_name}"?`
                  }
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className={`flex-1 px-6 py-3.5 rounded-xl border-2 ${borderClass} ${textColor} hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all`}
                  >
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-red-500/25 transition-all"
                  >
                    {language === "ar" ? "حذف" : "Delete"}
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

export default UserManagement;
