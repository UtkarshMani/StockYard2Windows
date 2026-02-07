'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BackButton from '@/components/back-button';
import { UserCog, Save, X, Mail, User, Phone, Shield } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'warehouse_staff', 'gatepass_staff', 'project_manager'], {
    required_error: 'Role is required',
  }),
  phone: z.string().optional(),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const currentUser = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    // Check if user is admin
    if (currentUser?.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
      return;
    }

    fetchUser();
  }, [currentUser, router, userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}`);
      const user = response.data.data?.user || response.data.data;
      
      setValue('email', user.email);
      setValue('fullName', user.fullName);
      setValue('role', user.role);
      setValue('phone', user.phone || '');
      setValue('isActive', user.isActive);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast.error('Failed to load user details');
      router.push('/dashboard/users');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    try {
      const userData = {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        phone: data.phone || undefined,
        isActive: data.isActive,
      };

      await api.put(`/users/${userId}`, userData);
      toast.success('User updated successfully!');
      router.push('/dashboard/users');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update user';
      toast.error(message);
      console.error('User update error:', error);
    } finally {
      setIsLoading(false);
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
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/users" />
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <UserCog className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
                <p className="text-gray-600 mt-1">Update user account details</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              Personal Information
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('fullName')}
                  type="text"
                  id="fullName"
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...register('email')}
                      type="email"
                      id="email"
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...register('phone')}
                      type="tel"
                      id="phone"
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-600" />
              Account Settings
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('role')}
                  id="role"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select role</option>
                  <option value="admin">Admin - Full system access</option>
                  <option value="warehouse_staff">Warehouse Staff - Inventory management</option>
                  <option value="gatepass_staff">Gate Pass Staff - Gate passes and invoices</option>
                  <option value="project_manager">Project Manager - Project management</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    {...register('isActive')}
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Account</span>
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Inactive users cannot log in to the system
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Note</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• To change the password, use the Reset Password button from the user list</li>
              <li>• Changes take effect immediately after saving</li>
              <li>• Deactivating a user will prevent them from logging in</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
