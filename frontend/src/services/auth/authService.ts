import { apiClient, isMockMode } from '@services/api/apiClient';
import type { LoginRequest, LoginResponse, RegisterRequest, User } from '@type-defs/auth';
import type { ApiResponse } from '@type-defs/api';

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
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  }

  async register(credentials: RegisterRequest): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/auth/register', credentials);
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    apiClient.clearTokens();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me');
  }

  async refreshToken(): Promise<void> {
    await apiClient.refreshAccessToken();
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/users/${userId}`, data);
  }

  async changePassword(userId: string, current: string, newPass: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>(`/users/${userId}/password`, { current, newPass });
  }
}

export const authService = new AuthServiceImpl();