import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '@services/auth/authService';
import { apiClient } from '@services/api/apiClient';
import type { User, AuthState, LoginRequest, RegisterRequest } from '@type-defs/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

function normalizeUser(rawUser: any): User {
  if (!rawUser) return rawUser;
  let firstName = rawUser.firstName;
  let lastName = rawUser.lastName;

  if (!firstName && rawUser.fullName) {
    const parts = (rawUser.fullName as string).trim().split(' ');
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  return {
    ...rawUser,
    id: String(rawUser.id || rawUser.userId || ''),
    firstName: firstName || rawUser.username || 'User',
    lastName: lastName || '',
    role: rawUser.role || 'Technician',
    status: rawUser.status || 'active',
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const loadStoredAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedRefreshToken && storedUser) {
        apiClient.setTokens(storedToken, storedRefreshToken);
        const user = normalizeUser(JSON.parse(storedUser));
        setState({
          user,
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const login = async (credentials: LoginRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authService.login(credentials);

      if (response.success && response.data) {
        const { user: rawUser, accessToken, refreshToken } = response.data;
        const user = normalizeUser(rawUser);

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        apiClient.setTokens(accessToken, refreshToken);

        setState({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error?.message ?? 'Login failed',
        }));
        // Throw an object so the UI can check err.code
        throw Object.assign(
          new Error(response.error?.message ?? 'Login failed'),
          { code: response.error?.code }
        );
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  };

  const register = async (credentials: RegisterRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.register(credentials);
      if (!response.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error?.message ?? 'Registration failed',
        }));
        throw new Error(response.error?.message ?? 'Registration failed');
      }
      setState((prev) => ({ ...prev, isLoading: false, error: null }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }));
      throw error;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      apiClient.clearTokens();

      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success && response.data) {
        const user = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        setState((prev) => ({ ...prev, user }));
      }
    } catch {
      // Ignore refresh errors
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false;
    const permissions: Record<string, string[]> = {
      Technician: ['assets:read', 'evidence:create', 'evidence:read:own', 'qr:scan'],
      Manager: ['assets:read', 'assets:write', 'evidence:read:all', 'evidence:approve', 'qr:scan', 'qr:generate'],
      Auditor: ['assets:read', 'evidence:read:all', 'evidence:verify', 'audit:read', 'audit:export', 'qr:scan'],
      Admin: ['assets:read', 'assets:write', 'assets:delete', 'evidence:read:all', 'evidence:verify', 'evidence:delete', 'users:read', 'users:write', 'users:delete', 'audit:read', 'audit:export', 'qr:scan', 'qr:generate', 'system:configure'],
    };
    return permissions[state.user.role]?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}