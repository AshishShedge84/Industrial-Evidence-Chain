export type UserRole = 'Technician' | 'Manager' | 'Auditor' | 'Admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'rejected';

export type AvatarType = 'profile' | 'memoji';

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  avatarType?: AvatarType;
  selectedMemoji?: string;
  contactNumber?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Technician: [
    'assets:read',
    'evidence:create',
    'evidence:read:own',
    'qr:scan',
  ],
  Manager: [
    'assets:read',
    'assets:write',
    'evidence:read:all',
    'evidence:verify',
    'evidence:approve',
    'qr:scan',
    'qr:generate',
  ],
  Auditor: [
    'assets:read',
    'evidence:read:all',
    'evidence:verify',
    'audit:read',
    'audit:export',
    'qr:scan',
  ],
  Admin: [
    'assets:read',
    'assets:write',
    'assets:delete',
    'evidence:read:all',
    'evidence:verify',
    'evidence:delete',
    'users:read',
    'users:write',
    'users:delete',
    'audit:read',
    'audit:export',
    'qr:scan',
    'qr:generate',
    'system:configure',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}