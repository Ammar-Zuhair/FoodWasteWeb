import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getReturns,
  createReturn,
  updateReturnStatus,
  getReturnsRecommendations,
  getReturnsDashboardStats,
  updateReturnItemOutcome as apiUpdateItemOutcome
} from '../utils/api/returns.js';

/**
 * Hook for returns dashboard stats
 */
export function useReturnsDashboard(periodDays = 30) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReturnsDashboardStats(periodDays);
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching returns dashboard stats:", err);
      // Fallback for demo if backend not fully wired/restarted
      setStats({
        kpi: { return_rate: 0, total_orders: 0, total_returns: 0, total_loss: 0, avg_processing_hours: 0 },
        trend: [],
        causes: []
      });
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, reload: fetchStats };
}

export function useReturns(filters = {}) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.facility_id) params.append('facility_id', filters.facility_id);

      const res = await getReturns(filters);
      setReturns(res.data || []);
      setPagination({
        total: res.total || 0,
        page: res.page || 1,
        totalPages: res.total_pages || 1
      });
      setError(null);

    } catch (err) {
      setError(err);
      console.error("Error fetching returns:", err);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const updateStatus = async (id, status, notes) => {
    try {
      await updateReturnStatus(id, status, notes);
      await fetchReturns();
      return true;
    } catch (err) {
      console.error("Error updating status:", err);
      return false;
    }
  };

  const updateItemOutcome = async (itemId, outcome, notes) => {
    try {
      await apiUpdateItemOutcome(itemId, outcome, notes);
      await fetchReturns(); // Reload to see updated status? or maybe just local update?
      // Backend `list_returns` returns item outcomes, so reload updates UI.
      return true;
    } catch (err) {
      console.error("Error updating return item outcome:", err);
      return false;
    }
  }

  return { returns, pagination, loading, error, reload: fetchReturns, updateStatus, updateItemOutcome };
}

/**
 * Hook for returns AI recommendations
 */
export function useReturnsRecommendations(options = {}) {
  const { autoLoad = false } = options;
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReturnsRecommendations({ force_refresh: force });
      setRecommendations(res.recommendations || []);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  return {
    recommendations,
    loading,
    error,
    fetchRecommendations: load
  };
}


/**
 * Hook for creating returns
 */
export function useCreateReturn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = useCallback(async (returnData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await createReturn(returnData);
      return result;
    } catch (err) {
      console.error('Error creating return:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    create,
    loading,
    error,
  };
}

// Deprecated or Dummy
export function useReturnsAnalysis() {
  return { analysis: {}, loading: false, error: null };
}
