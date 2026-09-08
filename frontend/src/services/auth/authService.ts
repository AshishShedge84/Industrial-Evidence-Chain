import { apiClient, isMockMode } from '@services/api/apiClient';
import type { LoginRequest, LoginResponse, RegisterRequest, User } from '@type-defs/auth';
import type { ApiResponse } from '@type-defs/api';
import { mockAuthService } from '@mocks/index';

export interface AuthService {
  login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>>;
  register(credentials: RegisterRequest): Promise<ApiResponse<{ message: string }>>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<ApiResponse<User>>;
  refreshToken(): Promise<void>;
  updateProfile(userId: string, data: Partial<User>): Promise<ApiResponse<User>>;
  changePassword(userId: string, current: string, newPass: string): Promise<ApiResponse<{ message: string }>>;
}

class AuthServiceImpl implements AuthService {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    if (isMockMode()) {
      return mockAuthService.login(credentials);
    }
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  }

  async register(credentials: RegisterRequest): Promise<ApiResponse<{ message: string }>> {
    if (isMockMode()) {
      return mockAuthService.register(credentials);
    }
    return apiClient.post<{ message: string }>('/auth/register', credentials);
  }

  async logout(): Promise<void> {
    if (!isMockMode()) {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Ignore logout errors
      }
    }
    apiClient.clearTokens();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    if (isMockMode()) {
      return mockAuthService.getCurrentUser();
    }
    return apiClient.get<User>('/auth/me');
  }

  async refreshToken(): Promise<void> {
    if (!isMockMode()) {
      await apiClient.refreshAccessToken();
    }
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    if (isMockMode()) {
      return (mockAuthService as any).updateProfile(userId, data);
    }
    return apiClient.patch<User>(`/users/${userId}`, data);
  }

  async changePassword(userId: string, current: string, newPass: string): Promise<ApiResponse<{ message: string }>> {
    if (isMockMode()) {
      return (mockAuthService as any).changePassword(userId, current, newPass);
    }
    return apiClient.post<{ message: string }>(`/users/${userId}/password`, { current, newPass });
  }
}

export const authService = new AuthServiceImpl();