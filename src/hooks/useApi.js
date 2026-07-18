// ============================================================
//  src/hooks/useApi.js — Reusable Data Fetching Hooks
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// ── Generic fetch hook ─────────────────────────────────────────
export function useFetch(apiFn, params = {}, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(params);
      setData(res.data ?? res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Generic paginated list hook ────────────────────────────────
export function useList(apiFn, initialParams = {}) {
  const [rows,       setRows]       = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, limit:20, totalPages:1 });
  const [params,     setParams]     = useState(initialParams);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const load = useCallback(async (p = params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(p);
      setRows(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFn, params]);

  useEffect(() => { load(); }, [params]);

  const updateParams = useCallback((updates) => {
    setParams(prev => ({ ...prev, ...updates, page: updates.page ?? 1 }));
  }, []);

  return { rows, pagination, params, loading, error, reload: load, updateParams };
}

// ── Generic mutation hook ──────────────────────────────────────
export function useMutation(apiFn, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      if (options.successMessage) toast.success(options.successMessage);
      if (options.onSuccess)      options.onSuccess(res);
      return res;
    } catch (err) {
      setError(err.message);
      toast.error(options.errorMessage || err.message);
      if (options.onError) options.onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFn, options]);

  return { mutate, loading, error };
}

// ── Dashboard KPIs ─────────────────────────────────────────────
export { useFetch as useDashboardKPIs };

// ── Format helpers shared across components ────────────────────
export const fmt    = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n || 0);
export const fmtCur = (n, currency = 'GHS') =>
  new Intl.NumberFormat('en-US', { style:'currency', currency, minimumFractionDigits:2 }).format(n || 0);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
export const fmtPct  = (n) => `${(n || 0).toFixed(1)}%`;

// ── Image upload validation (shared by Inventory + Settings logo) ──
// Mirrors the backend's own multer limits (product images and org
// logos both cap at 5MB) — catching a bad file here means an
// immediate, specific message instead of a round trip that fails
// with the same error the server would have thrown anyway.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const validateImageFile = (file, { allowSvg = false } = {}) => {
  const allowed = allowSvg ? [...ALLOWED_IMAGE_TYPES, 'image/svg+xml'] : ALLOWED_IMAGE_TYPES;
  if (!allowed.includes(file.type)) {
    return allowSvg
      ? 'Only JPG, PNG, WEBP, GIF or SVG images are allowed'
      : 'Only JPG, PNG, WEBP or GIF images are allowed';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image is too large (${(file.size / (1024*1024)).toFixed(1)}MB) — max 5MB`;
  }
  return null;
};
