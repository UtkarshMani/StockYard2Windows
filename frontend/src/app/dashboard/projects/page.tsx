'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/back-button';
import {
  FolderKanban,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  DollarSign,
  User,
  MapPin,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  siteAddress: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status: string;
  createdAt: string;
  projectManager?: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: {
    stockMovements: number;
    gatePasses: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/projects?${params}`);
      setProjects(response.data.data.projects || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete project "${name}"?`)) return;

    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.siteAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      planning: { label: 'Planning', color: 'bg-gray-50 text-gray-700' },
      active: { label: 'Active', color: 'bg-green-50 text-green-700' },
      on_hold: { label: 'On Hold', color: 'bg-yellow-50 text-yellow-700' },
      completed: { label: 'Completed', color: 'bg-blue-50 text-blue-700' },
      cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700' },
    };

    const config = statusConfig[status] || statusConfig.planning;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const statusCounts = {
    all: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    planning: projects.filter((p) => p.status === 'planning').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard" />
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                <p className="text-gray-600 mt-1">
                  Manage construction and electrical projects
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/projects/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Project
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
              </div>
              <FolderKanban className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
              </div>
              <FolderKanban className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Planning</p>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.planning}</p>
              </div>
              <FolderKanban className="w-10 h-10 text-gray-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.completed}</p>
              </div>
              <FolderKanban className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <FolderKanban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by creating your first project'}
            </p>
            {!searchTerm && !statusFilter && (
              <button
                onClick={() => router.push('/dashboard/projects/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">{project.projectCode}</p>
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 line-clamp-2">{project.siteAddress}</p>
                  </div>

                  {project.projectManager && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-600 truncate">
                        {project.projectManager.fullName}
                      </p>
                    </div>
                  )}

                  {project.budget && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-semibold">₹</span>
                      <p className="text-sm text-gray-600">
                        {Number(project.budget).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {project.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-600">
                        {new Date(project.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {project._count && (
                  <div className="flex gap-4 mb-4 text-xs text-gray-500">
                    <span>{project._count.stockMovements} movements</span>
                    <span>{project._count.gatePasses} gate passes</span>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id, project.name)}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
