export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ASSETS: '/assets',
  ASSET_DETAILS: (id: string) => `/assets/${id}`,
  EVIDENCE_CAPTURE: '/evidence/capture',
  EVIDENCE_DETAILS: (id: string) => `/evidence/${id}`,
  EVIDENCE_HISTORY: (id: string) => `/evidence/${id}/history`,
  VERIFICATION: '/verification',
  AUDIT: '/audit',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '*',
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.UNAUTHORIZED,
] as const;

export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.ASSETS,
  ROUTES.EVIDENCE_CAPTURE,
  ROUTES.VERIFICATION,
  ROUTES.AUDIT,
] as const;

export const ROLE_ROUTES: Record<string, string[]> = {
  Technician: [ROUTES.DASHBOARD, ROUTES.ASSETS, ROUTES.EVIDENCE_CAPTURE, ROUTES.PROFILE, ROUTES.SETTINGS, '/evidence'],
  Manager: [ROUTES.DASHBOARD, ROUTES.ASSETS, ROUTES.VERIFICATION, ROUTES.AUDIT, ROUTES.PROFILE, ROUTES.SETTINGS, '/evidence'],
  Auditor: [ROUTES.DASHBOARD, ROUTES.ASSETS, ROUTES.VERIFICATION, ROUTES.AUDIT, ROUTES.PROFILE, ROUTES.SETTINGS, '/evidence'],
  Admin: [ROUTES.DASHBOARD, ROUTES.ASSETS, ROUTES.VERIFICATION, ROUTES.AUDIT, ROUTES.PROFILE, ROUTES.SETTINGS, ROUTES.ADMIN, '/evidence'],
};

export function getDefaultRouteForRole(role: string): string {
  return ROUTES.DASHBOARD;
}

export function canAccessRoute(role: string, route: string): boolean {
  if (!role) return false;
  const matchedRoleKey = Object.keys(ROLE_ROUTES).find(
    (k) => k.toLowerCase() === role.toLowerCase()
  );
  const allowedRoutes = matchedRoleKey ? (ROLE_ROUTES[matchedRoleKey] ?? []) : [];
  
  // Explicitly deny capture if not authorized, even though '/evidence' prefix matches
  if (route.startsWith(ROUTES.EVIDENCE_CAPTURE) && !allowedRoutes.includes(ROUTES.EVIDENCE_CAPTURE)) {
    return false;
  }
  
  return allowedRoutes.some((r) => route.startsWith(r));
}