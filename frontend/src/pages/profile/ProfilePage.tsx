import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@hooks/useAuth';
import { PageContainer } from '@components/layout';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { UserAvatar } from '@components/ui/UserAvatar';
import {
  User as UserIcon,
  Camera,
  Save,
  Lock,
  X,
  Phone,
  Sparkles,
  Check,
  Plus,
  Image as ImageIcon,
  Smile,
} from 'lucide-react';
import { useApp } from '@context/AppContext';
import { authService } from '@services/auth/authService';
import {
  getRoleMemojiExpressions,
  ROLE_DEFAULT_MAIN_MEMOJI,
  type RoleMemojiExpressionKey,
} from '@utils/avatarResolver';
import type { AvatarType, UserRole } from '@type-defs/auth';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Derive initial values
  const userRole: UserRole = user?.role || 'Technician';
  const defaultMainMemoji = ROLE_DEFAULT_MAIN_MEMOJI[userRole] || 'Thinking';

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    contactNumber: user?.contactNumber || '',
    bio: user?.bio || '',
    avatarType: (user?.avatarType || (user?.avatarUrl ? 'profile' : 'memoji')) as AvatarType,
    selectedMemoji: (user?.selectedMemoji || defaultMainMemoji) as RoleMemojiExpressionKey,
    avatarUrl: user?.avatarUrl || '',
  });

  // Sync state if user changes in auth context
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        contactNumber: user.contactNumber !== undefined ? user.contactNumber : prev.contactNumber,
        bio: user.bio !== undefined ? user.bio : prev.bio,
        avatarType: user.avatarType || (user.avatarUrl ? 'profile' : 'memoji'),
        selectedMemoji: (user.selectedMemoji as RoleMemojiExpressionKey) || defaultMainMemoji,
        avatarUrl: user.avatarUrl || prev.avatarUrl,
      }));
    }
  }, [user, defaultMainMemoji]);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Available 6 Memoji expressions for the current user's role
  const roleExpressions = getRoleMemojiExpressions(userRole);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please upload a valid image file (PNG, JPG, or WebP).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Profile image size must be under 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        avatarUrl: dataUrl,
        avatarType: 'profile',
      }));
      addToast({
        type: 'success',
        title: 'Photo Selected',
        message: 'Profile picture loaded. Click "Save Changes" to persist.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateYourOwn = () => {
    addToast({
      type: 'info',
      title: 'COMING SOON',
      message: 'Custom 3D Memoji creation and studio face rigging will be available in an upcoming release.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    const res = await authService.updateProfile(user.id, formData);

    setIsSaving(false);
    if (res.success && res.data) {
      // Sync local storage user cache immediately
      try {
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        console.warn('Failed to update local user storage:', err);
      }

      await refreshUser();

      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile identity and contact information have been saved.',
      });
    } else {
      addToast({
        type: 'error',
        title: 'Error',
        message: res.error?.message || 'Failed to update profile',
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({ type: 'error', title: 'Error', message: 'Passwords do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      addToast({ type: 'error', title: 'Error', message: 'Password must be at least 8 characters.' });
      return;
    }

    setIsChangingPassword(true);
    const res = await authService.changePassword(
      user.id,
      passwordForm.currentPassword,
      passwordForm.newPassword
    );
    setIsChangingPassword(false);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password was successfully updated.',
      });
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      addToast({
        type: 'error',
        title: 'Error',
        message: res.error?.message || 'Failed to change password.',
      });
    }
  };

  // Preview user object reflecting the unsaved live selections
  const previewUser = {
    ...user,
    role: userRole,
    firstName: formData.firstName || user?.firstName || 'User',
    lastName: formData.lastName || user?.lastName || '',
    avatarType: formData.avatarType,
    selectedMemoji: formData.selectedMemoji,
    avatarUrl: formData.avatarUrl,
  };

  return (
    <PageContainer
      title="Your Profile"
      description="Manage your personal information, contact number, and visual identity."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Profile' },
      ]}
    >
      <div className="max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/80 dark:bg-[#0e1219]/90 backdrop-blur-2xl rounded-[32px] p-6 sm:p-10 border border-black/5 dark:border-white/10 shadow-sm relative overflow-hidden"
        >
          {/* Top Section: Live Identity Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 mb-8 pb-8 border-b border-black/5 dark:border-white/10">
            <div className="relative group flex-shrink-0">
              <UserAvatar
                user={previewUser}
                size="2xl"
                className="shadow-lg ring-4 ring-black/5 dark:ring-white/10"
              />
              {formData.avatarType === 'profile' && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                  title="Upload profile picture"
                >
                  <Camera className="h-8 w-8 text-white" />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {formData.firstName || 'First'} {formData.lastName || 'Last'}
                </h2>
                <span className="inline-flex items-center gap-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-xs font-semibold capitalize">
                  <UserIcon className="h-3.5 w-3.5" />
                  {userRole}
                </span>
              </div>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 font-medium mt-1">
                {formData.email}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Smile className="h-3.5 w-3.5 text-primary-500" />
                  Active Identity:{' '}
                  <strong className="text-gray-800 dark:text-gray-200 capitalize">
                    {formData.avatarType === 'profile'
                      ? 'Custom Photo'
                      : `${userRole} ${formData.selectedMemoji}`}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Profile Identity Switcher */}
            <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl p-5 sm:p-6 border border-black/5 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                    Profile Identity
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Choose how you visually appear across notification panels, comments, and audit trails.
                  </p>
                </div>

                {/* Identity Mode Toggle */}
                <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-white/10 border border-black/5 dark:border-white/5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, avatarType: 'profile' }))}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      formData.avatarType === 'profile'
                        ? 'bg-white dark:bg-[#1b2230] text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Profile Picture
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, avatarType: 'memoji' }))}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      formData.avatarType === 'memoji'
                        ? 'bg-white dark:bg-[#1b2230] text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Memoji Avatar
                  </button>
                </div>
              </div>

              {/* Identity Mode Panel */}
              {formData.avatarType === 'profile' ? (
                /* Profile Picture Option */
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/5">
                    <UserAvatar
                      avatarType="profile"
                      avatarUrl={formData.avatarUrl}
                      user={user}
                      size="xl"
                      className="shadow-sm ring-2 ring-primary-500/20"
                    />
                    <div className="flex-1 text-center sm:text-left">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Upload Custom Photo
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        High resolution square photos work best (PNG, JPG, max 5MB).
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs h-8 px-3 rounded-lg"
                        >
                          <Camera className="h-3.5 w-3.5 mr-1.5" />
                          Choose Image
                        </Button>
                        {formData.avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: '' }))}
                            className="text-xs text-error-600 dark:text-error-400 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Memoji Avatar Customization Grid */
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Available <strong className="text-gray-900 dark:text-white">{userRole}</strong> Memoji Expressions:
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Role default: <span className="font-semibold text-primary-500">{defaultMainMemoji}</span>
                    </span>
                  </div>

                  {/* 6 Role Memoji Choices + Create Your Own */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {roleExpressions.map((exp) => {
                      const isSelected = formData.selectedMemoji === exp.key;
                      return (
                        <button
                          key={exp.key}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              selectedMemoji: exp.key,
                              avatarType: 'memoji',
                            }))
                          }
                          className={`relative p-3 rounded-2xl flex flex-col items-center gap-2 transition-all cursor-pointer group text-center ${
                            isSelected
                              ? 'bg-primary-50/80 dark:bg-primary-950/40 border-2 border-primary-500 shadow-md ring-2 ring-primary-500/20'
                              : 'bg-white/60 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}

                          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center overflow-hidden border border-black/5 dark:border-white/10 group-hover:scale-105 transition-transform">
                            <img
                              src={exp.url}
                              alt={`${userRole} ${exp.label}`}
                              className="w-full h-full object-contain scale-[1.8] translate-y-[3px]"
                            />
                          </div>

                          <span
                            className={`text-[11px] font-semibold truncate max-w-full ${
                              isSelected
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {exp.label}
                          </span>
                        </button>
                      );
                    })}

                    {/* Option 7: Create Your Own */}
                    <button
                      type="button"
                      onClick={handleCreateYourOwn}
                      className="relative p-3 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-black/15 dark:border-white/15 hover:border-primary-500/60 dark:hover:border-primary-400/60 bg-white/40 dark:bg-white/[0.02] hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all cursor-pointer group text-center min-h-[110px]"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        + Create Your Own
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-primary-600/70 dark:text-primary-400/70 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                        Soon
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Personal & Contact Information */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  id="firstName"
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  disabled={isSaving}
                  required
                />
                <Input
                  id="lastName"
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  id="email"
                  type="email"
                  label="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={isSaving}
                  required
                />

                {/* Contact Number Field */}
                <div>
                  <Input
                    id="contactNumber"
                    type="tel"
                    label="Contact Number"
                    placeholder="+91 98765 43210"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: e.target.value }))}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  disabled={isSaving}
                  placeholder="Share a short bio or duty assignment..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-black/5 dark:border-white/10">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto rounded-xl"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                <Lock className="h-4 w-4 mr-2" /> Change Password
              </Button>
              <Button
                type="submit"
                loading={isSaving}
                className="w-full sm:w-auto min-w-[140px] rounded-xl shadow-md"
              >
                {!isSaving && (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </span>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsPasswordModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-[#11141c] text-gray-900 dark:text-white backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-black/10 dark:border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Lock className="h-5 w-5 text-primary-500" /> Change Password
                </h2>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  type="password"
                  label="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                  }
                  required
                />
                <Input
                  type="password"
                  label="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  required
                />
                <Input
                  type="password"
                  label="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                  }
                  required
                />

                <div className="pt-4 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPasswordModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={isChangingPassword}>
                    Change Password
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
