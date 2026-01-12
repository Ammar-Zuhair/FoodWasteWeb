/**
 * Reports API Service
 */
import { API_CONFIG } from '../../config/api.config.js';
import { getAuthHeaders } from './auth.js';

const BASE_URL = `${API_CONFIG.baseURL}/api/v1/reports`;

/**
 * Get dashboard report
 * @returns {Promise<Object>}
 */
export async function getDashboardReport() {
  try {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard report:', error);
    throw error;
  }
}

/**
 * Get comprehensive system overview with all metrics
 * @returns {Promise<Object>}
 */
export async function getSystemOverview(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);

    const url = `${BASE_URL}/system-overview${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching system overview:', error);
    throw error;
  }
}


/**
 * Get waste report
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>}
 */
export async function getWasteReport(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);

    const url = `${BASE_URL}/waste${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching waste report:', error);
    throw error;
  }
}

/**
 * Get inventory report
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>}
 */
export async function getInventoryReport(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.facility_id) params.append('facility_id', filters.facility_id);

    const url = `${BASE_URL}/inventory${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    throw error;
  }
}

/**
 * Generate custom report
 * @param {Object} reportConfig - Report configuration
 * @returns {Promise<Object>}
 */
export async function generateCustomReport(reportConfig) {
  try {
    const response = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reportConfig),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating custom report:', error);
    throw error;
  }
}

/**
 * Download report
 * @param {string} reportId - Report ID
 * @param {string} format - Report format (pdf, excel)
 * @returns {Promise<Blob>}
 */
export async function downloadReport(reportId, format = 'pdf') {
  try {
    const response = await fetch(`${BASE_URL}/${reportId}/download?format=${format}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
}

/**
 * Export report as Excel
 * @param {string} reportType - Report type: waste, inventory, dashboard
 * @param {Object} filters - Filter options (facility_id, start_date, end_date)
 * @returns {Promise<void>}
 */
export async function exportReportExcel(reportType, filters = {}) {
  try {
    const params = new URLSearchParams();
    params.append('report_type', reportType);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const url = `${BASE_URL}/export/excel?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    // Generate descriptive Arabic filename
    const dateStr = new Date().toISOString().split('T')[0];
    const reportTypeNames = {
      waste: 'تقرير_الهدر',
      inventory: 'تقرير_المخزون',
      dashboard: 'تقرير_لوحة_التحكم'
    };
    const filename = `${reportTypeNames[reportType] || 'تقرير'}_${dateStr}.xlsx`;

    // Download file
    const blob = await response.blob();
    const url_blob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url_blob;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url_blob);
  } catch (error) {
    console.error('Error exporting Excel report:', error);
    throw error;
  }
}


// ===============================
// API V2 Functions - Enhanced Reports (using v1 endpoint)
// ===============================

const BASE_URL_V2 = `${API_CONFIG.baseURL}/api/v1/reports`;

/**
 * Get comprehensive report with all KPIs and insights (API v2)
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>}
 */
export async function getComprehensiveReport(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);
    if (filters.product_id) params.append('product_id', filters.product_id);
    if (filters.cause_type) params.append('cause_type', filters.cause_type);

    const url = `${BASE_URL_V2}/comprehensive${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching comprehensive report:', error);
    throw error;
  }
}

/**
 * Get waste insights with comparisons (API v2)
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Object>}
 */
export async function getWasteInsights(days = 30) {
  try {
    const response = await fetch(`${BASE_URL_V2}/waste-insights?days=${days}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching waste insights:', error);
    throw error;
  }
}

/**
 * Generate AI-powered executive summary (API v2)
 * @param {Object} reportData - Validated report data
 * @param {string} language - 'ar' or 'en'
 * @returns {Promise<Object>}
 */
export async function generateAISummary(reportData, language = 'ar') {
  try {
    // Validate required fields before sending
    if (!reportData.kpis || !reportData.top_causes || !reportData.period) {
      throw new Error('Missing required fields: kpis, top_causes, period');
    }

    const response = await fetch(`${BASE_URL_V2}/generate-ai-summary?language=${language}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Invalid or incomplete data');
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw error;
  }
}

/**
 * Get latest AI summary (API v2)
 * @param {string} language - 'ar' or 'en'
 * @returns {Promise<Object>}
 */
export async function getLatestAISummary(language = 'ar') {
  try {
    const response = await fetch(`${BASE_URL_V2}/ai-summary/latest?language=${language}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Handle 404 or empty response gracefully
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if body is empty
    const text = await response.text();
    if (!text) return null;

    return JSON.parse(text);
  } catch (error) {
    console.error('Error fetching latest AI summary:', error);
    return null;
  }
}

/**
 * Export comprehensive report as Excel with Meta sheet (API v2)
 * @param {Object} filters - Filter options
 * @returns {Promise<void>}
 */
export async function exportComprehensiveExcel(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);
    if (filters.user_email) params.append('user_email', filters.user_email);

    const url = `${BASE_URL_V2}/export/comprehensive-excel?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    // Generate descriptive Arabic filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `تقرير_ترشيد_شامل_${dateStr}.xlsx`;

    // Download file
    const blob = await response.blob();
    const url_blob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url_blob;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url_blob);
  } catch (error) {
    console.error('Error exporting comprehensive Excel:', error);
    throw error;
  }
}

/**
 * Export professional Waste Executive Report (Excel)
 * @param {Object} filters - Filter options
 * @returns {Promise<void>}
 */
export async function exportWasteExecutiveReport(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);

    const url = `${BASE_URL}/export/waste-executive?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    // Generate descriptive Arabic filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `تقرير_الهدر_التنفيذي_${dateStr}.xlsx`;

    const blob = await response.blob();
    const url_blob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url_blob;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url_blob);
  } catch (error) {
    console.error('Error exporting waste executive report:', error);
    throw error;
  }
}

/**
 * Export professional Sales Report (Excel)
 * @param {Object} filters - Filter options
 * @returns {Promise<void>}
 */
export async function exportSalesReport(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);

    const url = `${BASE_URL}/export/sales-report?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    // Generate descriptive Arabic filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `تقرير_المبيعات_${dateStr}.xlsx`;

    const blob = await response.blob();
    const url_blob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url_blob;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url_blob);
  } catch (error) {
    console.error('Error exporting sales report:', error);
    throw error;
  }
}


/**
 * Export comprehensive report as PDF (API v2)
 * @param {Object} filters - Filter options
 * @returns {Promise<void>}
 */
export async function exportComprehensivePDF(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);
    if (filters.language) params.append('language', filters.language);
    if (filters.report_type) params.append('report_type', filters.report_type);
    if (filters.generated_by) params.append('generated_by', filters.generated_by);

    const url = `${BASE_URL_V2}/export/comprehensive-pdf?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    // Generate descriptive Arabic filename based on report_type
    const dateStr = new Date().toISOString().split('T')[0];
    const reportTypeNames = {
      comprehensive: filters.language === 'ar' ? 'تقرير_ترشيد_شامل' : 'comprehensive_report',
      waste: filters.language === 'ar' ? 'تقرير_الهدر' : 'waste_report',
      inventory: filters.language === 'ar' ? 'تقرير_المخزون' : 'inventory_report',
      sales: filters.language === 'ar' ? 'تقرير_المبيعات' : 'sales_report',
      executive: filters.language === 'ar' ? 'تقرير_تنفيذي' : 'executive_report',
      vehicles: filters.language === 'ar' ? 'تقرير_الشاحنات' : 'vehicles_report',
      customers: filters.language === 'ar' ? 'تقرير_العملاء' : 'customers_report'
    };
    const reportName = reportTypeNames[filters.report_type] || reportTypeNames.comprehensive;
    const filename = `${reportName}_${dateStr}.pdf`;

    // Download file
    const blob = await response.blob();
    const url_blob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url_blob;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url_blob);
  } catch (error) {
    console.error('Error exporting comprehensive PDF:', error);
    throw error;
  }
}

/**
 * Get monthly waste trend data with month names
 * @param {number} months - Number of months to fetch
 * @returns {Promise<Object>}
 */
export async function getMonthlyWasteTrend(months = 12, facility_id = null) {
  try {
    let url = `${BASE_URL}/monthly-waste?months=${months}`;
    if (facility_id) {
      url += `&facility_id=${facility_id}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching monthly waste trend:', error);
    throw error;
  }
}
/**
 * Get donation impact report incl. Waste Diversion Rate
 * @param {string} period - 'month', 'quarter', 'year'
 * @returns {Promise<Object>}
 */
export async function getDonationImpactReport(period = 'month', facility_id = null) {
  try {
    let url = `${BASE_URL}/donation-impact?period=${period}`;
    if (facility_id) {
      url += `&facility_id=${facility_id}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching donation impact report:', error);
    throw error;
  }
}


// =====================================================
// VEHICLE REPORTS - تقارير الشاحنات
// =====================================================

/**
 * Export vehicle report as PDF
 */
export async function exportVehicleReportPDF(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);
    if (filters.language) params.append('language', filters.language);

    const url = `${BASE_URL}/export/vehicles-pdf?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = filters.language === 'ar'
      ? `تقرير_الشاحنات_${dateStr}.pdf`
      : `vehicles_report_${dateStr}.pdf`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error exporting vehicle report PDF:', error);
    throw error;
  }
}

/**
 * Export vehicle report as Excel
 */
export async function exportVehicleReportExcel(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);

    const url = `${BASE_URL}/export/vehicles-excel?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `تقرير_الشاحنات_${dateStr}.xlsx`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error exporting vehicle report Excel:', error);
    throw error;
  }
}


// =====================================================
// CUSTOMER REPORTS - تقارير العملاء
// =====================================================

/**
 * Export customer report as PDF
 */
export async function exportCustomerReportPDF(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);
    if (filters.language) params.append('language', filters.language);

    const url = `${BASE_URL}/export/customers-pdf?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = filters.language === 'ar'
      ? `تقرير_العملاء_${dateStr}.pdf`
      : `customers_report_${dateStr}.pdf`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error exporting customer report PDF:', error);
    throw error;
  }
}

/**
 * Export customer report as Excel
 */
export async function exportCustomerReportExcel(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.facility_id) params.append('facility_id', filters.facility_id);

    const url = `${BASE_URL}/export/customers-excel?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `تقرير_العملاء_${dateStr}.xlsx`;
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error exporting customer report Excel:', error);
    throw error;
  }
}

// Helper function for downloading blobs
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
