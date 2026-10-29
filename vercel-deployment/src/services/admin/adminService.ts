import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SEEDED_USERS, SEEDED_AUDIT_LOGS } from '@/data/authoritativeSeed';
import type { User, UserRole, UserStatus } from '@type-defs/auth';
import type { ApiResponse } from '@type-defs/api';

export interface AdminService {
  getUsers(): Promise<ApiResponse<User[]>>;
  updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse<User>>;
  updateUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>>;
  addUser(data: Partial<User>): Promise<ApiResponse<User>>;
  getAuditLogs(limit?: number): Promise<ApiResponse<any[]>>;
}

function cleanFirestoreDoc(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanFirestoreDoc(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

function normalizeUser(docId: string, data: any): User {
  const firstName = data.firstName || data.fullName?.split(' ')[0] || data.username || 'User';
  const lastName = data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '';

  let role: UserRole = 'Technician';
  if (data.role) {
    const rawRole = String(data.role).toLowerCase();
    if (rawRole.includes('admin')) role = 'Admin';
    else if (rawRole.includes('manager')) role = 'Manager';
    else if (rawRole.includes('auditor')) role = 'Auditor';
    else role = 'Technician';
  }

  return {
    id: docId,
    email: data.email || '',
    username: data.username || data.email?.split('@')[0] || '',
    fullName: data.fullName || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    role,
    status: (data.status as UserStatus) || (data.isActive === false ? 'suspended' : 'active'),
    avatarUrl: data.avatarUrl,
    avatarType: data.avatarType || 'profile',
    selectedMemoji: data.selectedMemoji,
    contactNumber: data.contactNumber,
    bio: data.bio,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt)) : new Date().toISOString(),
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt)) : new Date().toISOString(),
  };
}

class FirebaseAdminServiceImpl implements AdminService {
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const users: User[] = [];
      try {
        const usersRef = collection(db, 'users');
        const snap = await getDocs(usersRef);
        snap.forEach((d) => {
          users.push(normalizeUser(d.id, d.data()));
        });
      } catch {
        // Fallback to seeded authoritative users
      }

      if (users.length === 0) {
        users.push(...SEEDED_USERS);
      }

      return {
        success: true,
        data: users,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch users',
          statusCode: 500,
        },
      };
    }
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<ApiResponse<User>> {
    try {
      const userRef = doc(db, 'users', userId);
      const now = new Date().toISOString();
      await updateDoc(userRef, { status, updatedAt: now });

      const snap = await getDoc(userRef);
      return {
        success: true,
        data: normalizeUser(snap.id, snap.data()),
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update user status',
          statusCode: 400,
        },
      };
    }
  }

  async updateUser(userId: string, data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const userRef = doc(db, 'users', userId);
      const now = new Date().toISOString();
      const sanitized = cleanFirestoreDoc({
        ...data,
        updatedAt: now,
      });
      // Do not store empty/undefined passwords in user document
      if ('password' in sanitized && !sanitized.password) {
        delete sanitized.password;
      }
      await updateDoc(userRef, sanitized);

      const snap = await getDoc(userRef);
      return {
        success: true,
        data: normalizeUser(snap.id, snap.data()),
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update user',
          statusCode: 400,
        },
      };
    }
  }

  async addUser(data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();
      const firstName = data.firstName || 'New';
      const lastName = data.lastName || 'User';

      const newUser = cleanFirestoreDoc({
        id: userId,
        email: data.email || `user_${Date.now()}@iec.app`,
        username: data.username || data.email?.split('@')[0] || `user_${Date.now()}`,
        fullName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        role: data.role || 'Technician',
        status: data.status || 'active',
        bio: data.bio || '',
        createdAt: now,
        updatedAt: now,
      });

      await setDoc(doc(db, 'users', userId), newUser);

      return {
        success: true,
        data: newUser as User,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error.message || 'Failed to add user',
          statusCode: 400,
        },
      };
    }
  }

  async getAuditLogs(limitCount: number = 100): Promise<ApiResponse<any[]>> {
    try {
      const logs: any[] = [];
      try {
        const logsRef = collection(db, 'audit_logs');
        const snap = await getDocs(logsRef);
        snap.forEach((d) => {
          logs.push({ id: d.id, ...d.data() });
        });
      } catch {
        // Fallback to seeded audit logs
      }

      if (logs.length === 0) {
        logs.push(...SEEDED_AUDIT_LOGS);
      }

      logs.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());

      return {
        success: true,
        data: logs.slice(0, limitCount),
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch audit logs',
          statusCode: 500,
        },
      };
    }
  }
}

export const adminService = new FirebaseAdminServiceImpl();
