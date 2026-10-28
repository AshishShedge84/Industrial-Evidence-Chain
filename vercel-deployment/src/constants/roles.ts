export const USER_ROLES = [
  'Technician',
  'Manager',
  'Auditor',
  'Admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  Technician: 'Technician',
  Manager: 'Manager',
  Auditor: 'Auditor',
  Admin: 'Administrator',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  Technician: 'Field technician responsible for capturing evidence',
  Manager: 'Manages assets and reviews evidence submissions',
  Auditor: 'Audits and verifies evidence integrity',
  Admin: 'System administrator with full access',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  Technician: 1,
  Manager: 2,
  Auditor: 3,
  Admin: 4,
};

export function isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}