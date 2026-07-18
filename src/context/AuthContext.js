// ============================================================
//  src/context/AuthContext.js — Global Auth State
// ============================================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/services';
import { clearAuth } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Bootstrap: reload user from localStorage on refresh ───
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  // ── Login ──────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user: u, accessToken, refreshToken } = res.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user',         JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  // ── Register ───────────────────────────────────────────────
  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const { user: u, accessToken, refreshToken } = res.data;
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user',         JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    clearAuth();
    setUser(null);
  }, []);

  // ── Refresh current user ───────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      const u   = res.data;
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch { logout(); }
  }, [logout]);

  // ── Permission check helper ────────────────────────────────
  const hasRole = useCallback((role) => {
    return user?.roles?.includes(role) || user?.roles?.includes('Admin');
  }, [user]);

  // Module-level check — mirrors what the server's authorizeModule()
  // actually enforces (see accounting-api's role.routes.js, where an
  // Admin can edit which modules a role can see), rather than a
  // hardcoded role-name list baked into this app. Admin still
  // bypasses unconditionally, same reasoning as hasRole().
  const hasModule = useCallback((moduleKey) => {
    return user?.permissions?.includes(moduleKey) || user?.roles?.includes('Admin');
  }, [user]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated,
      login, register, logout, refreshUser, hasRole, hasModule,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
