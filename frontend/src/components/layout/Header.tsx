import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, LogOut, ChevronDown, Moon, Sun, Monitor, Settings, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useApp } from '@context/AppContext';
import { useAuth } from '@hooks/useAuth';
import { BrandMark } from '@components/ui/BrandMark';
import { UserAvatar } from '@components/ui/UserAvatar';
import { NotificationCenter } from '@components/notifications/NotificationCenter';
import { useNotifications } from '@hooks/useNotifications';

export function Header() {
  const { sidebarOpen, setMobileMenuOpen, theme, setTheme } = useApp();
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const { unreadCount } = useNotifications();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setIsScrolled((prev) => {
            // Hysteresis: activate at > 20px, deactivate at < 8px
            if (scrollY > 20) return true;
            if (scrollY < 8) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch {
      // Handled in context
    }
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-none ${
        sidebarOpen ? 'lg:left-64' : 'lg:left-20'
      }`}
    >
      {/* Floating Glass Island Panel */}
      <div
        className={`mx-3 sm:mx-6 lg:mx-8 mt-2 sm:mt-3 transition-all duration-300 ease-out pointer-events-auto flex items-center justify-between h-14 sm:h-16 px-3 sm:px-5 rounded-2xl sm:rounded-full ${
          isScrolled
            ? 'bg-white/70 dark:bg-[#0B0F17]/70 backdrop-blur-xl -webkit-backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {/* Left mobile menu and logo */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`lg:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full ${
              isScrolled ? 'hover:bg-black/5 dark:hover:bg-white/10' : 'glass-panel'
            }`}
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className={`flex items-center ${isScrolled ? '' : 'lg:hidden glass-panel px-3 py-1.5 rounded-full'}`}>
            <BrandMark size="md" />
          </div>
        </div>

        {/* Right floating controls */}
        <div className={`flex items-center gap-1 sm:gap-1.5 rounded-full p-1 transition-colors ${
          isScrolled ? '' : 'glass-panel shadow-sm'
        } ml-auto`}>
          {/* Theme Toggle */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="p-2 sm:p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Theme options"
              aria-expanded={themeMenuOpen}
            >
              {getThemeIcon()}
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-3 w-36 glass-panel-strong rounded-2xl shadow-xl p-1.5 animate-fade-in origin-top-right z-50">
                <button
                  onClick={() => { setTheme('light'); setThemeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                    theme === 'light'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" /> Light
                </button>
                <button
                  onClick={() => { setTheme('dark'); setThemeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                    theme === 'dark'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" /> Dark
                </button>
                <button
                  onClick={() => { setTheme('system'); setThemeMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                    theme === 'system'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> System
                </button>
              </div>
            )}
          </div>

          {/* Notification Bell with Dropdown Popover */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 sm:p-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white dark:ring-[#0F1218] animate-pulse" />
              )}
            </button>

            {/* Notification Center Popover */}
            <NotificationCenter
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
            />
          </div>

          {/* Vertical Divider */}
          <div className="h-5 w-px bg-black/10 dark:bg-white/10 hidden sm:block mx-1" />

          {/* User profile / avatar & dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 sm:p-1.5 sm:pl-2 sm:pr-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <UserAvatar user={user} size="sm" showBorder={false} />
              <span className="hidden sm:block text-[13px] font-medium text-gray-900 dark:text-white">
                {user?.firstName}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-3 w-[calc(100vw-32px)] max-w-[280px] sm:w-64 glass-panel-strong rounded-[24px] shadow-xl p-2 animate-fade-in origin-top-right z-50">
                <div className="px-4 py-4 mb-2 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </span>
                    <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full capitalize">
                      {user?.role}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </span>
                    {user?.status === 'pending' ? (
                      <span className="text-[11px] font-semibold text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/30 px-2 py-0.5 rounded-full">
                        Pending Approval
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/30 px-2 py-0.5 rounded-full capitalize">
                        Approved
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <UserIcon className="h-4 w-4" />
                    Your Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Preferences
                  </Link>
                  {user?.role === 'Admin' && (
                    <Link
                      to="/admin/users"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      User Management
                    </Link>
                  )}
                  <div className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-xl transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}