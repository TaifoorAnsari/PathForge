/**
 * Axios Instance — Pre-configured HTTP Client
 * 
 * Every API call in the app uses this instance, never raw axios.
 * 
 * Request interceptor:
 *   Attaches the JWT access token from the Zustand auth store
 *   to every outgoing request's Authorization header.
 * 
 * Response interceptor:
 *   Catches 401 (Unauthorized) responses, attempts to refresh
 *   the access token by calling /api/v1/auth/refresh, and retries
 *   the original request. If refresh also fails, logs the user out.
 */

import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  withCredentials: true, // Send httpOnly refresh token cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach Access Token ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 + Token Refresh ─────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry refresh calls themselves or auth login/register calls
    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    // Only attempt refresh on 401 and only once per non-auth request
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Another refresh is in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie
        const { data } = await axios.post('/api/v1/auth/refresh', {}, {
          withCredentials: true,
        });

        const newToken = data.data.accessToken;
        const newUser = data.data.user;

        useAuthStore.getState().setAccessToken(newToken);
        if (newUser) {
          useAuthStore.getState().setUser(newUser);
        }

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh failed — log the user out
        useAuthStore.getState().logout();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
