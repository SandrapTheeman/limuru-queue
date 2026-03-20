'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, createContext, useContext, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/stores/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore();

  return (
    <AuthContext.Provider
      value={{
        user: store.user,
        isAuthenticated: store.isAuthenticated,
        isLoading: store.isLoading,
        login: store.login,
        register: store.register,
        logout: store.logout,
        checkAuth: store.checkAuth,
        error: store.error,
        clearError: store.clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

export const useProviders = () => {
  return null;
};
