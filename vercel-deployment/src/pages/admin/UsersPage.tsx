import { useState, useEffect } from 'react';
import { PageContainer } from '@components/layout';
import { User, Shield, CheckCircle, XCircle, Loader2, Edit2, Plus, X } from 'lucide-react';
import { adminService } from '@services/admin/adminService';
import type { User as UserType, UserStatus } from '@type-defs/auth';
import { useApp } from '@context/AppContext';
import { Button, Input } from '@components/ui';
import { UserAvatar } from '@components/ui/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';

export function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(Partial<UserType> & { password?: string }) | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const res = await adminService.getUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (id: string, status: UserStatus) => {
    const res = await adminService.updateUserStatus(id, status);
    if (res.success) {
      addToast({ type: 'success', title: 'User Updated', message: `User status changed to ${status}.` });
      fetchUsers();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.error?.message || 'Failed to update user' });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsLoading(true);

    const payload: Partial<UserType> = {
      firstName: editingUser.firstName?.trim() || '',
      lastName: editingUser.lastName?.trim() || '',
      fullName: `${editingUser.firstName?.trim() || ''} ${editingUser.lastName?.trim() || ''}`.trim(),
      email: editingUser.email?.trim().toLowerCase() || '',
      role: editingUser.role,
      status: editingUser.status,
      bio: editingUser.bio?.trim() || '',
    };
    if (editingUser.avatarUrl) payload.avatarUrl = editingUser.avatarUrl;
    if (editingUser.selectedMemoji) payload.selectedMemoji = editingUser.selectedMemoji;

    let res;
    if (editingUser.id) {
      res = await adminService.updateUser(editingUser.id, payload);
    } else {
      res = await adminService.addUser(payload);
    }

    setIsLoading(false);
    if (res.success) {
      addToast({ type: 'success', title: 'Saved', message: 'User updated and role assigned successfully.' });
      setIsModalOpen(false);
      fetchUsers();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.error?.message || 'Failed to save user' });
    }
  };

  const openAdd = () => {
    setEditingUser({ role: 'Technician', status: 'active' });
    setIsModalOpen(true);
  };

  const openEdit = (u: UserType) => {
    setEditingUser(u);
    setIsModalOpen(true);
  };

  return (
    <PageContainer
      title="User Management"
      description="Manage accounts, roles, and pending approvals."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Admin', href: '/admin/users' },
        { label: 'Users' },
      ]}
    >
      <div className="flex justify-end mb-4">
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add User</Button>
      </div>
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-[24px] border border-black/5 dark:border-white/10 shadow-sm overflow-hidden min-h-[300px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50/50 dark:bg-white/5 text-xs uppercase text-gray-700 dark:text-gray-300 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 bg-transparent">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} size="md" />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-xs font-semibold capitalize">
                      {user.role === 'Admin' ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'active' ? 'text-green-600 bg-green-50' :
                      user.status === 'pending' ? 'text-amber-600 bg-amber-50' :
                      'text-red-600 bg-red-50'
                    }`}>
                      {user.status === 'active' && <CheckCircle className="h-3.5 w-3.5" />}
                      <span className="capitalize">{user.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {user.status === 'pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(user.id, 'active')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle className="h-5 w-5" /></button>
                          <button onClick={() => handleUpdateStatus(user.id, 'rejected')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="h-5 w-5" /></button>
                        </>
                      )}
                      {user.status === 'active' && user.id !== '4' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'suspended')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Suspend"><XCircle className="h-5 w-5" /></button>
                      )}
                      {user.status === 'suspended' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'active')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Reactivate"><CheckCircle className="h-5 w-5" /></button>
                      )}
                      <button onClick={() => openEdit(user)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-[#111111] backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-transparent dark:border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold dark:text-white">{editingUser.id ? 'Edit User' : 'Add User'}</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-gray-500 dark:text-gray-400" /></button>
              </div>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={editingUser.firstName || ''} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} required />
                  <Input label="Last Name" value={editingUser.lastName || ''} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} required />
                </div>
                <Input label="Email" type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Role</label>
                    <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})} className="w-full bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option>Technician</option><option>Manager</option><option>Auditor</option><option>Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Status</label>
                    <select value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value as any})} className="w-full bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Bio</label>
                  <textarea rows={3} value={editingUser.bio || ''} onChange={e => setEditingUser({...editingUser, bio: e.target.value})} className="w-full bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                
                {editingUser.id && (
                  <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                    <p className="text-sm font-medium mb-2 dark:text-white">Reset Password</p>
                    <Input type="password" placeholder="New Password" onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                  </div>
                )}
                {!editingUser.id && (
                  <Input type="password" label="Initial Password" required onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Save User</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
