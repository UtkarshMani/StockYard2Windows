'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BackButton from '@/components/back-button';
import {
  FolderKanban,
  Save,
  X,
  Calendar,
  DollarSign,
  MapPin,
  FileText,
  User,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  siteAddress: z.string().min(1, 'Site address is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  projectManagerId: z.string().min(1, 'Project manager is required'),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'planning',
    },
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    fetchProjectManagers();
  }, []);

  // Auto-fill end date when project is marked as completed
  useEffect(() => {
    if (selectedStatus === 'completed') {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // yyyy-mm-dd format
      setValue('endDate', formattedDate);
    }
  }, [selectedStatus, setValue]);

  const fetchProjectManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await api.get('/users?role=project_manager');
      setProjectManagers(response.data.data.users || []);
      
      // Also fetch admins as they can be project managers
      const adminResponse = await api.get('/users?role=admin');
      const admins = adminResponse.data.data.users || [];
      setProjectManagers(prev => [...prev, ...admins]);
    } catch (error: any) {
      console.error('Failed to fetch project managers:', error);
      toast.error('Failed to load project managers');
    } finally {
      setLoadingManagers(false);
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    setIsLoading(true);
    try {
      // Convert dates to ISO format
      const startDate = new Date(data.startDate).toISOString();
      const endDate = data.endDate ? new Date(data.endDate).toISOString() : undefined;
      
      // Convert budget to number if provided
      const budget = data.budget ? parseFloat(data.budget) : undefined;

      const projectData = {
        name: data.name,
        description: data.description || undefined,
        siteAddress: data.siteAddress,
        startDate,
        endDate,
        budget,
        projectManagerId: data.projectManagerId,
        status: data.status,
      };

      await api.post('/projects', projectData);
      toast.success('Project created successfully!');
      router.push('/dashboard/projects');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create project';
      toast.error(message);
      console.error('Project creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push('/dashboard/projects');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/projects" />
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">New Project</h1>
                <p className="text-gray-600 mt-1">
                  Create a new construction or electrical project
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Basic Information
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  placeholder="e.g., Downtown Office Building"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  id="description"
                  rows={4}
                  placeholder="Provide a detailed description of the project..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="siteAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Site Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('siteAddress')}
                    type="text"
                    id="siteAddress"
                    placeholder="e.g., 123 Main Street, City, State, ZIP"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.siteAddress && (
                  <p className="mt-1 text-sm text-red-600">{errors.siteAddress.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Status <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('status')}
                  id="status"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Project Timeline & Budget */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Timeline & Budget
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('startDate')}
                  type="date"
                  id="startDate"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="dd/mm/yyyy"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  {...register('endDate')}
                  type="date"
                  id="endDate"
                  disabled={selectedStatus === 'active'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="dd/mm/yyyy"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                )}
                {selectedStatus === 'active' && (
                  <p className="mt-1 text-sm text-gray-500">End date cannot be set for active projects</p>
                )}
                {selectedStatus === 'completed' && (
                  <p className="mt-1 text-sm text-green-600">Auto-filled with today's date</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Budget (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input
                    {...register('budget')}
                    type="number"
                    step="0.01"
                    id="budget"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.budget && (
                  <p className="mt-1 text-sm text-red-600">{errors.budget.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Project Manager */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              Project Manager
            </h2>

            <div>
              <label htmlFor="projectManagerId" className="block text-sm font-medium text-gray-700 mb-2">
                Assign Project Manager <span className="text-red-500">*</span>
              </label>
              {loadingManagers ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading managers...</span>
                </div>
              ) : (
                <select
                  {...register('projectManagerId')}
                  id="projectManagerId"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project manager</option>
                  {projectManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.fullName} ({manager.email}) - {manager.role.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
              {errors.projectManagerId && (
                <p className="mt-1 text-sm text-red-600">{errors.projectManagerId.message}</p>
              )}
              {projectManagers.length === 0 && !loadingManagers && (
                <p className="mt-2 text-sm text-amber-600">
                  No project managers available. Please create a user with project manager role first.
                </p>
              )}
            </div>
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
              disabled={isLoading || loadingManagers}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
