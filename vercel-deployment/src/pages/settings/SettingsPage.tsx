import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@context/AppContext';
import { PageContainer } from '@components/layout';
import { Button } from '@components/ui/Button';
import { Bell, Shield, Moon, Sun, Monitor, Smartphone, Globe, Save } from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme, addToast } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    twoFactorAuth: false,
    language: 'en',
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof settings] }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    
    addToast({
      type: 'success',
      title: 'Settings saved',
      message: 'Your preferences have been updated successfully.',
    });
  };

  return (
    <PageContainer
      title="Settings"
      description="Manage your app preferences and security settings."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Settings' },
      ]}
    >
      <div className="max-w-3xl space-y-6">
        
        {/* Appearance Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl rounded-[32px] p-8 sm:p-10 border border-black/5 dark:border-white/5 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/5 dark:border-white/10">
            <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Customize how the application looks on your device.</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Theme Preference</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  theme === 'light' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                    : 'border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5'
                }`}
              >
                <Sun className="h-6 w-6" />
                <span className="text-sm font-semibold">Light</span>
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  theme === 'dark' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                    : 'border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5'
                }`}
              >
                <Moon className="h-6 w-6" />
                <span className="text-sm font-semibold">Dark</span>
              </button>
              
              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  theme === 'system' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                    : 'border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5'
                }`}
              >
                <Monitor className="h-6 w-6" />
                <span className="text-sm font-semibold">System</span>
              </button>
            </div>
          </div>

          <div className="space-y-4 mt-8">
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Language</p>
            <div className="relative max-w-sm">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white rounded-xl pl-11 pr-4 py-3 h-12 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="en">English (US)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl rounded-[32px] p-8 sm:p-10 border border-black/5 dark:border-white/5 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/5 dark:border-white/10">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Manage how and when you receive updates.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Receive daily digests and critical alerts via email.</p>
              </div>
              <button 
                onClick={() => handleToggle('emailNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.emailNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Receive real-time alerts in your browser.</p>
              </div>
              <button 
                onClick={() => handleToggle('pushNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.pushNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl rounded-[32px] p-8 sm:p-10 border border-black/5 dark:border-white/5 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/5 dark:border-white/10">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Protect your account and control access.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Add an extra layer of security to your account.</p>
              </div>
              <button 
                onClick={() => handleToggle('twoFactorAuth')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.twoFactorAuth ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-end pt-4 pb-12">
          <Button onClick={handleSubmit} loading={isSaving} className="min-w-[140px] rounded-xl">
            {!isSaving && (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Preferences
              </span>
            )}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
