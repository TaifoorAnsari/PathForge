/**
 * Auth Store (Zustand)
 * 
 * Global state for authentication:
 * - user: the logged-in user's profile data
 * - accessToken: JWT access token (kept in memory, NOT localStorage)
 * - isAuthenticated: derived boolean
 * - isLoading: boolean tracking initial session check
 */

import { create } from 'zustand';
import api from '@/lib/axios';

export const useAuthStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────────────
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  // ─── Actions ────────────────────────────────────────────

  /**
   * Called after successful login or token refresh.
   */
  login: (user, accessToken) => {
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });

    try {
      localStorage.setItem('pf_user', JSON.stringify(user));
    } catch {
      // Ignore
    }
  },

  /**
   * Clear all auth state.
   */
  logout: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });

    try {
      localStorage.removeItem('pf_user');
    } catch {
      // Ignore
    }
  },

  setAccessToken: (accessToken) => {
    set({ accessToken, isAuthenticated: !!accessToken });
  },

  setUser: (user) => {
    set({ user });
    try {
      localStorage.setItem('pf_user', JSON.stringify(user));
    } catch {
      // Ignore
    }
  },

  /**
   * Attempt silent authentication restore on app launch
   */
  initializeAuth: async () => {
    try {
      // Try silent refresh using the httpOnly cookie via configured api client
      const res = await api.post('/auth/refresh');

      if (res.data?.success && res.data.data?.accessToken) {
        const { user, accessToken } = res.data.data;
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
        try {
          localStorage.setItem('pf_user', JSON.stringify(user));
        } catch {
          // Ignore
        }
        return;
      }
    } catch {
      // No active refresh session or expired
    }

    // If refresh failed, clear any stale cached user so app stays in clean unauthenticated state
    try {
      localStorage.removeItem('pf_user');
    } catch {
      // Ignore
    }
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },
}));
