import { apiClient, isMockMode } from '@services/api/apiClient';
import type { User, UserStatus } from '@type-defs/auth';
import type { ApiResponse } from '@type-defs/api';


export interface AdminService {
  getUsers(): Promise<ApiResponse<User[]>>;
  updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse<User>>;
  updateUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>>;
  addUser(data: Partial<User>): Promise<ApiResponse<User>>;
}

class AdminServiceImpl implements AdminService {
  async getUsers(): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>('/admin/users');
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/admin/users/${userId}/status`, { status });
  }

  async updateUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/admin/users/${userId}`, data);
  }

  async addUser(data: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/admin/users', data);
  }
}

export const adminService = new AdminServiceImpl();
