'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BackButton from '@/components/back-button';
import { Shield, Save, X, Check } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';

interface Permission {
  resource: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

const resourceLabels: Record<string, string> = {
  inventory: 'Inventory Management',
  projects: 'Projects',
  gatepass: 'Gate Pass & Invoices',
  purchase_orders: 'Purchase Orders',
  suppliers: 'Suppliers',
  users: 'User Management',
  analytics: 'Analytics & Reports',
  settings: 'System Settings',
};

export default function UserPermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const currentUser = useAuthStore((state) => state.user);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (currentUser?.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
      return;
    }

    fetchUserAndPermissions();
  }, [currentUser, router, userId]);

  const fetchUserAndPermissions = async () => {
    try {
      setLoading(true);
      const [userRes, permRes, defaultsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/permissions/${userId}`).catch(() => ({ data: { data: { permissions: [] } } })),
        api.get('/permissions/defaults'),
      ]);

      const userData = userRes.data.data?.user || userRes.data.data;
      setUser(userData);

      const existingPerms = permRes.data.data?.permissions || [];
      const defaults = defaultsRes.data.data?.permissions || [];

      // Merge with defaults to show all resources
      const mergedPermissions = defaults.map((def: Permission) => {
        const existing = existingPerms.find((p: Permission) => p.resource === def.resource);
        return existing || def;
      });

      setPermissions(mergedPermissions);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load user permissions');
      router.push('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    resource: string,
    permission: 'canView' | 'canCreate' | 'canEdit' | 'canDelete',
    value: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((perm) =>
        perm.resource === resource ? { ...perm, [permission]: value } : perm
      )
    );
  };

  const handleSelectAll = (permission: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
    const allChecked = permissions.every((p) => p[permission]);
    setPermissions((prev) =>
      prev.map((perm) => ({ ...perm, [permission]: !allChecked }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/permissions/${userId}`, permissions);
      toast.success('Permissions updated successfully!');
      router.push('/dashboard/users');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push('/dashboard/users');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/users" />
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Permissions</h1>
                <p className="text-gray-600 mt-1">
                  Manage access permissions for {user.fullName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">User Information</p>
              <p className="text-sm text-blue-800 mt-1">
                <span className="font-medium">{user.fullName}</span> ({user.email}) - Role:{' '}
                <span className="font-medium">{user.role}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSelectAll('canView')}
                      className="flex items-center gap-1 mx-auto hover:text-purple-600 transition-colors"
                    >
                      View
                      <Check className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSelectAll('canCreate')}
                      className="flex items-center gap-1 mx-auto hover:text-purple-600 transition-colors"
                    >
                      Create
                      <Check className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSelectAll('canEdit')}
                      className="flex items-center gap-1 mx-auto hover:text-purple-600 transition-colors"
                    >
                      Edit
                      <Check className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSelectAll('canDelete')}
                      className="flex items-center gap-1 mx-auto hover:text-purple-600 transition-colors"
                    >
                      Delete
                      <Check className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <tr key={permission.resource} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {resourceLabels[permission.resource] || permission.resource}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={permission.canView}
                        onChange={(e) =>
                          handlePermissionChange(
                            permission.resource,
                            'canView',
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={permission.canCreate}
                        onChange={(e) =>
                          handlePermissionChange(
                            permission.resource,
                            'canCreate',
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={permission.canEdit}
                        onChange={(e) =>
                          handlePermissionChange(
                            permission.resource,
                            'canEdit',
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={permission.canDelete}
                        onChange={(e) =>
                          handlePermissionChange(
                            permission.resource,
                            'canDelete',
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">Important Notes</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• These permissions are granular and override role-based permissions</li>
            <li>• Admin users always have full access regardless of these settings</li>
            <li>• Click column headers to toggle all permissions for that action</li>
            <li>• Changes take effect immediately after saving</li>
          </ul>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
