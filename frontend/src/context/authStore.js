import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

// Helper function to extract error message
const getErrorMessage = (error) => {
  const detail = error.response?.data?.detail;
  if (!detail) return 'An error occurred';
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object') {
    // Handle validation errors with password_errors or other fields
    if (detail.password_errors && Array.isArray(detail.password_errors)) {
      return detail.password_errors.join(', ');
    }
    // Handle array of validation errors
    if (Array.isArray(detail)) {
      return detail.map(e => e.msg || e.message || String(e)).join(', ');
    }
    // Handle object with msg field
    if (detail.msg) return detail.msg;
    // Fallback: stringify the object
    return JSON.stringify(detail);
  }
  return String(detail);
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { username, password });
          const { access_token, refresh_token } = response.data;
          
          // Set tokens
          set({ 
            accessToken: access_token, 
            refreshToken: refresh_token,
            isAuthenticated: true 
          });
          
          // Fetch user info
          const userResponse = await api.get('/auth/me');
          set({ user: userResponse.data, isLoading: false });
          
          return { success: true };
        } catch (error) {
          const message = getErrorMessage(error);
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Register action
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/register', userData);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = getErrorMessage(error);
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Logout action
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          // Ignore logout errors
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Refresh token
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        
        try {
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = response.data;
          set({ accessToken: access_token, refreshToken: refresh_token });
          return true;
        } catch (error) {
          get().logout();
          return false;
        }
      },

      // Update user profile
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.put('/users/me', profileData);
          set({ user: response.data, isLoading: false });
          return { success: true };
        } catch (error) {
          const message = getErrorMessage(error);
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Refresh user data from server
      refreshUser: async () => {
        try {
          const userResponse = await api.get('/auth/me');
          set({ user: userResponse.data });
          return { success: true };
        } catch (error) {
          const message = getErrorMessage(error);
          return { success: false, error: message };
        }
      },

      // Change password
      changePassword: async (passwordData) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/users/me/change-password', {
            current_password: passwordData.current_password,
            new_password: passwordData.new_password,
          });
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = getErrorMessage(error);
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'penlet-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);