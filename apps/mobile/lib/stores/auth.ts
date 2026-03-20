import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "../api/client";

interface User {
  id: string;
  name: string;
  type: "patient" | "staff";
  staffId?: string;
  patientId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: {
    patientId?: string;
    staffId?: string;
    password?: string;
    type: "patient" | "staff";
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const stored = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: {
    patientId?: string;
    staffId?: string;
    password?: string;
    type: "patient" | "staff";
  }) => {
    const response = await apiClient.post<{ user: User; token: string }>(
      "/auth/login",
      credentials
    );

    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(response.user));
    await SecureStore.setItemAsync("auth_token", response.token);
    setUser(response.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    await SecureStore.deleteItemAsync("auth_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
