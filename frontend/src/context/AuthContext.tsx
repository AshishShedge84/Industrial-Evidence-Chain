import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

  let role = rawUser.role || (Array.isArray(rawUser.roles) && rawUser.roles[0]) || 'Technician';
  if (typeof role === 'string' && role.length > 0) {
    role = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  return {
    ...rawUser,
    id: String(rawUser.id || rawUser.userId || ''),
    firstName: firstName || rawUser.username || 'User',
    lastName: lastName || '',
    role,
    status: rawUser.status || 'active',
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedRefreshToken && storedUser) {
        apiClient.setTokens(storedToken, storedRefreshToken);
        const user = normalizeUser(JSON.parse(storedUser));
        return {
          user,
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };
      }
    } catch {}
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'access_token') {
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
            setState({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
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
  }, []);

  const register = useCallback(async (credentials: RegisterRequest) => {
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
  }, []);

  const logout = useCallback(async () => {
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
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success && response.data) {
        const user = normalizeUser(response.data);
        localStorage.setItem('user', JSON.stringify(user));
        setState((prev) => {
          if (JSON.stringify(prev.user) === JSON.stringify(user)) return prev;
          return { ...prev, user };
        });
      }
    } catch {
      // Ignore refresh errors
    }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    const permissions: Record<string, string[]> = {
      Technician: ['assets:read', 'evidence:create', 'evidence:read:own', 'qr:scan'],
      Manager: ['assets:read', 'assets:write', 'evidence:read:all', 'evidence:verify', 'evidence:approve', 'qr:scan', 'qr:generate'],
      Auditor: ['assets:read', 'evidence:read:all', 'evidence:verify', 'audit:read', 'audit:export', 'qr:scan'],
      Admin: ['assets:read', 'assets:write', 'assets:delete', 'evidence:read:all', 'evidence:verify', 'evidence:delete', 'users:read', 'users:write', 'users:delete', 'audit:read', 'audit:export', 'qr:scan', 'qr:generate', 'system:configure'],
    };
    const matchedKey = Object.keys(permissions).find(
      (k) => k.toLowerCase() === state.user!.role.toLowerCase()
    );
    return (matchedKey ? permissions[matchedKey] : undefined)?.includes(permission) ?? false;
  }, [state.user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  }, [hasPermission]);

  const contextValue = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    refreshUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }), [state, login, register, logout, refreshUser, hasPermission, hasAnyPermission, hasAllPermissions]);

  return (
    <AuthContext.Provider value={contextValue}>
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