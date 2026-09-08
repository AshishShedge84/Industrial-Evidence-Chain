import type { LoginRequest, LoginResponse, RegisterRequest, User } from '@type-defs/auth';
import type { ApiResponse } from '@type-defs/api';
import { db } from './db';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAuthService = {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    await delay(500);

    const user = db.getUsers().find(u => u.email === credentials.email);
    // basic check, check if password exists, or if the user object has a saved password override
    const expectedPassword = (user as any)?.password || 'password123';
    
    if (!user || credentials.password !== expectedPassword) { 
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', statusCode: 401 },
      };
    }
    if (user.status === 'pending') {
      return { success: false, error: { code: 'ACCOUNT_PENDING', message: 'Pending approval.', statusCode: 403 } };
    }
    if (user.status === 'suspended') {
      return { success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Account suspended.', statusCode: 403 } };
    }

    const accessToken = `mock-access-token-${user.id}-${Date.now()}`;
    const refreshToken = `mock-refresh-token-${user.id}-${Date.now()}`;
    localStorage.setItem('auth_token', accessToken);

    return {
      success: true,
      data: { user, accessToken, refreshToken, expiresIn: 3600 },
      meta: { timestamp: new Date().toISOString(), requestId: `req-${Date.now()}`, version: '1.0.0' },
    };
  },

  async register(credentials: RegisterRequest): Promise<ApiResponse<{ message: string }>> {
    await delay(500);
    
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      email: credentials.email,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      role: credentials.role,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveUser(newUser);

    return {
      success: true,
      data: { message: 'Account created successfully. Pending administrator approval.' },
      meta: { timestamp: new Date().toISOString(), requestId: `req-${Date.now()}`, version: '1.0.0' },
    };
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    await delay(200);

    const token = localStorage.getItem('auth_token');
    if (!token) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'No authentication token', statusCode: 401 } };
    }

    const userId = token.split('-')[3];
    const user = db.getUsers().find(u => u.id === userId);
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found', statusCode: 404 } };
    }

    return {
      success: true,
      data: user,
      meta: { timestamp: new Date().toISOString(), requestId: `req-${Date.now()}`, version: '1.0.0' },
    };
  },

  async updateProfile(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    await delay(300);
    const users = db.getUsers();
    
    if (data.email) {
      const existing = users.find(u => u.email === data.email && u.id !== userId);
      if (existing) {
        return { success: false, error: { code: 'CONFLICT', message: 'This email address is already in use.', statusCode: 409 } };
      }
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND', message: 'Not found', statusCode: 404 } };
    
    const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
    db.saveUser(updated);

    db.saveAuditLog({
      id: `AUD-${Date.now()}`,
      evidenceId: 'N/A',
      action: 'ProfileUpdated' as any,
      performedBy: updated.firstName + ' ' + updated.lastName,
      performedAt: new Date().toISOString(),
      details: { userId }
    });

    return { success: true, data: updated };
  },

  async changePassword(userId: string, current: string, newPass: string): Promise<ApiResponse<{ message: string }>> {
    await delay(300);
    const users = db.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: { code: 'USER_NOT_FOUND', message: 'Not found', statusCode: 404 } };

    const expectedPassword = (user as any)?.password || 'password123';
    if (current !== expectedPassword) {
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect current password', statusCode: 401 } };
    }

    // Persist mock password
    const updated = { ...user, password: newPass, updatedAt: new Date().toISOString() };
    db.saveUser(updated);

    db.saveAuditLog({
      id: `AUD-${Date.now()}`,
      evidenceId: 'N/A',
      action: 'PasswordChanged' as any,
      performedBy: updated.firstName + ' ' + updated.lastName,
      performedAt: new Date().toISOString(),
      details: { userId }
    });

    return { success: true, data: { message: 'Password changed successfully' } };
  }
};