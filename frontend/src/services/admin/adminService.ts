import { apiClient, isMockMode } from '@services/api/apiClient';
import type { User, UserStatus } from '@type-defs/auth';
import type { ApiResponse } from '@type-defs/api';
import { db } from '@mocks/db';

export interface AdminService {
  getUsers(): Promise<ApiResponse<User[]>>;
  updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse<User>>;
  updateUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>>;
  addUser(data: Partial<User>): Promise<ApiResponse<User>>;
}

class AdminServiceImpl implements AdminService {
  async getUsers(): Promise<ApiResponse<User[]>> {
    if (isMockMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        data: db.getUsers(),
        meta: { timestamp: new Date().toISOString(), requestId: 'mock', version: '1' }
      };
    }
    return apiClient.get<User[]>('/admin/users');
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse<User>> {
    if (isMockMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = db.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 } };
      }
      
      const updatedUser = { ...users[userIndex], status };
      db.saveUser(updatedUser);
      
      let action = 'UserUpdated';
      if (status === 'active') action = 'UserApproved';
      else if (status === 'suspended') action = 'UserSuspended';
      else if (status === 'rejected') action = 'UserRejected';

      db.saveAuditLog({
        id: `AUD-${Date.now()}`,
        evidenceId: 'N/A',
        action: action as any,
        performedBy: 'Admin',
        performedAt: new Date().toISOString(),
        details: { userId, status }
      });
      
      return { success: true, data: updatedUser };
    }
    return apiClient.patch<User>(`/admin/users/${userId}/status`, { status });
  }

  async updateUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    if (isMockMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = db.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex === -1) return { success: false, error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 } };

      const updatedUser = { ...users[userIndex], ...data, updatedAt: new Date().toISOString() };
      db.saveUser(updatedUser);

      db.saveAuditLog({
        id: `AUD-${Date.now()}`,
        evidenceId: 'N/A',
        action: 'UserUpdated' as any,
        performedBy: 'Admin',
        performedAt: new Date().toISOString(),
        details: { userId, updates: Object.keys(data) }
      });

      return { success: true, data: updatedUser };
    }
    return apiClient.patch<User>(`/admin/users/${userId}`, data);
  }

  async addUser(data: Partial<User>): Promise<ApiResponse<User>> {
    if (isMockMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Automatic role-based Memoji assignment for new users
      const role = data.role || 'Technician';
      let defaultSelectedMemoji: string = 'Thinking';
      if (role === 'Admin') defaultSelectedMemoji = 'Idle';
      else if (role === 'Manager') defaultSelectedMemoji = 'Hover';
      else if (role === 'Auditor') defaultSelectedMemoji = 'Thinking';
      else if (role === 'Technician') {
        const existingTechs = db.getUsers().filter(u => u.role === 'Technician');
        // If technician #1 already exists (e.g. John Smith), assign Technician 2 to the next technician
        defaultSelectedMemoji = existingTechs.length % 2 !== 0 ? 'Technician 2' : 'Thinking';
      }

      const newUser: User = {
        id: `USR-${Date.now()}`,
        email: data.email || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        role,
        status: data.status || 'active',
        bio: data.bio || '',
        avatarType: data.avatarType || 'memoji',
        selectedMemoji: data.selectedMemoji || defaultSelectedMemoji,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const existing = db.getUsers().find(u => u.email === newUser.email);
      if (existing) {
        return { success: false, error: { code: 'CONFLICT', message: 'Email already exists', statusCode: 409 } };
      }

      db.saveUser(newUser);

      db.saveAuditLog({
        id: `AUD-${Date.now()}`,
        evidenceId: 'N/A',
        action: 'UserRegistered' as any,
        performedBy: 'Admin',
        performedAt: new Date().toISOString(),
        details: { userId: newUser.id }
      });

      return { success: true, data: newUser };
    }
    return apiClient.post<User>('/admin/users', data);
  }
}

export const adminService = new AdminServiceImpl();
