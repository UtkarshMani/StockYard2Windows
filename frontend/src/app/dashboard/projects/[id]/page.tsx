'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Loader2,
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

interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  siteAddress: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  projectManagerId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    fetchProjectManagers();
    fetchProject();
  }, [projectId]);

  // Auto-fill end date when project is marked as completed
  useEffect(() => {
    if (selectedStatus === 'completed') {
      const currentEndDate = watch('endDate');
      if (!currentEndDate) {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        setValue('endDate', formattedDate);
      }
    }
  }, [selectedStatus, setValue, watch]);

  const fetchProject = async () => {
    try {
      setIsFetching(true);
      const response = await api.get(`/projects/${projectId}`);
      const project: Project = response.data.data.project;
      
      // Format dates for input fields (yyyy-mm-dd)
      const startDate = project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '';
      const endDate = project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '';
      
      reset({
        name: project.name,
        description: project.description || '',
        siteAddress: project.siteAddress,
        startDate,
        endDate,
        budget: project.budget?.toString() || '',
        projectManagerId: project.projectManagerId || '',
        status: project.status as any,
      });
    } catch (error: any) {
      console.error('Failed to fetch project:', error);
      toast.error('Failed to load project details');
      router.push('/dashboard/projects');
    } finally {
      setIsFetching(false);
    }
  };

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
      const budget = data.budget && data.budget !== '' ? parseFloat(data.budget) : undefined;

      const payload = {
        name: data.name,
        description: data.description || undefined,
        siteAddress: data.siteAddress,
        startDate,
        endDate,
        budget,
        projectManagerId: data.projectManagerId,
        status: data.status,
      };

      await api.put(`/projects/${projectId}`, payload);
      toast.success('Project updated successfully!');
      router.push('/dashboard/projects');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update project';
      toast.error(message);
      console.error('Error updating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/projects');
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/projects" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Project</h1>
                <p className="text-gray-600 mt-1">Update project details and settings</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter project name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project description"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('siteAddress')}
                  rows={2}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.siteAddress ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter complete site address"
                />
                {errors.siteAddress && (
                  <p className="mt-1 text-sm text-red-500">{errors.siteAddress.message}</p>
                )}
              </div>
            </div>

            {/* Timeline & Budget */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline & Budget
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.startDate.message}</p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Expected/Actual)
                  </label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Budget */}
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Budget (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('budget')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Project Manager & Status */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Management
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Manager */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Manager <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('projectManagerId')}
                    disabled={loadingManagers}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.projectManagerId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">
                      {loadingManagers ? 'Loading...' : 'Select project manager'}
                    </option>
                    {projectManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.fullName} ({manager.role})
                      </option>
                    ))}
                  </select>
                  {errors.projectManagerId && (
                    <p className="mt-1 text-sm text-red-500">{errors.projectManagerId.message}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('status')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.status ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status-based Info */}
            {selectedStatus === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  💡 Tip: When marking a project as completed, make sure to fill in the end date above.
                </p>
              </div>
            )}

            {selectedStatus === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  ⚠️ Warning: Cancelled projects cannot have new stock movements or gate passes.
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || loadingManagers}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
