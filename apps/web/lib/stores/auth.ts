import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type AuthResponse } from '@/lib/api/endpoints';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: AuthResponse = await authApi.login({ email, password });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', response.token);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: AuthResponse = await authApi.register({ email, password, name });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', response.token);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
