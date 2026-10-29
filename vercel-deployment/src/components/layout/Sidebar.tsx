import { NavLink, Link, useLocation } from 'react-router-dom';
import { useApp } from '@context/AppContext';
import { useAuth } from '@hooks/useAuth';
import { BrandMark } from '@components/ui/BrandMark';
import {
  LayoutDashboard,
  Box,
  Camera,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
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

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useApp();
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  const filteredNavigation = navigation.filter((item) => hasPermission(item.permission));
  const filteredAdminNav = adminNavigation.filter((item) => hasPermission(item.permission));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 glass-panel border-y-0 border-l-0 transition-all duration-300 hidden lg:flex lg:flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-[72px] items-center justify-between px-6 border-b border-black/5 dark:border-white/5">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <BrandMark size="sm" />
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white tracking-tight leading-none pt-0.5">
                Industrial Evidence
              </span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
               <BrandMark size="sm" />
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8" aria-label="Main">
          <div>
            <ul className="space-y-1" role="list">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                      } ${!sidebarOpen ? 'justify-center' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      title={sidebarOpen ? undefined : item.name}
                    >
                      <item.icon 
                        className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} 
                        aria-hidden="true" 
                      />
                      {sidebarOpen && <span>{item.name}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {filteredAdminNav.length > 0 && (
            <div>
              {sidebarOpen && (
                <p className="px-3 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {user?.role === 'Auditor' ? 'Compliance' : 'System'}
                </p>
              )}
              <ul className="space-y-1" role="list">
                {filteredAdminNav.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <li key={item.name}>
                      <NavLink
                        to={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                        } ${!sidebarOpen ? 'justify-center' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        title={sidebarOpen ? undefined : item.name}
                      >
                        <item.icon 
                          className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} 
                          aria-hidden="true" 
                        />
                        {sidebarOpen && <span>{item.name}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-black/5 dark:border-white/5 flex justify-center lg:justify-between items-center">
          {sidebarOpen && (
            <div className="flex flex-col ml-2">
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">IEC Platform v2.5</p>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                <Link to="/privacy-policy" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">Privacy</Link>
                <span>•</span>
                <Link to="/terms-of-service" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">Terms</Link>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}