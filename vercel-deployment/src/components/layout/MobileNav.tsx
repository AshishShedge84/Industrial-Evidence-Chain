import { NavLink, useLocation } from 'react-router-dom';
import { X, LayoutDashboard, Box, Camera, Shield, FileText, Users, Settings } from 'lucide-react';
import { useApp } from '@context/AppContext';
import { useAuth } from '@hooks/useAuth';
import { ROUTES } from '@constants/routes';

const navigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard, permission: 'assets:read' },
  { name: 'Assets', href: ROUTES.ASSETS, icon: Box, permission: 'assets:read' },
  { name: 'Capture Evidence', href: ROUTES.EVIDENCE_CAPTURE, icon: Camera, permission: 'evidence:create' },
  { name: 'Verification', href: ROUTES.VERIFICATION, icon: Shield, permission: 'evidence:verify' },
] as const;

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: Users, permission: 'users:read' },
  { name: 'System Audit Reports', href: ROUTES.AUDIT, icon: FileText, permission: 'audit:read' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'system:configure' },
] as const;

interface MobileNavProps {
  onClose: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
  const { user, hasPermission } = useAuth();
  const { mobileMenuOpen } = useApp();
  const location = useLocation();

  const filteredNavigation = navigation.filter((item) => hasPermission(item.permission));
  const filteredAdminNav = adminNavigation.filter((item) => hasPermission(item.permission));

  return (
    <>
      {/* Backdrop overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-[#0B0F17] border-l border-gray-100 dark:border-white/10 shadow-2xl lg:hidden transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full invisible pointer-events-none'
        }`}
        aria-label="Mobile navigation"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">Industrial Evidence</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Close navigation"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <ul className="space-y-1" role="list">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-semibold'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>

            {filteredAdminNav.length > 0 && (
              <>
                <div className="h-px bg-gray-100 dark:bg-white/10 my-4" />
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {user?.role === 'Auditor' ? 'Compliance' : 'Administration'}
                </p>
                <ul className="space-y-1 mt-2" role="list">
                  {filteredAdminNav.map((item) => {
                    const isActive = location.pathname.startsWith(item.href);
                    return (
                      <li key={item.name}>
                        <NavLink
                          to={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-semibold'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                          <span>{item.name}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}