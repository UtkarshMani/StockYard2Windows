'use client';

import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Scan,
  ShoppingCart,
  FolderKanban,
  Folder,
  ClipboardList
} from 'lucide-react';

interface DashboardStats {
  activeProjects: number;
  pendingGatePasses: number;
}

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  roles: string[];
  description?: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    pendingGatePasses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [projectsRes, gatePassesRes] = await Promise.all([
          api.get('/projects'),
          api.get('/gatepass'),
        ]);

        setStats({
          activeProjects: projectsRes.data.data?.projects?.filter((p: any) => p.status === 'active')?.length || 0,
          pendingGatePasses: gatePassesRes.data.data?.gatePasses?.filter((b: any) => b.status === 'pending')?.length || 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems: MenuItem[] = [
    { icon: Package, label: 'Inventory', href: '/dashboard/inventory', roles: ['admin', 'warehouse_staff'] },
    { icon: Folder, label: 'Categories', href: '/dashboard/categories', roles: ['admin', 'warehouse_staff'] },
    { icon: Scan, label: 'Scan In', href: '/dashboard/scan', roles: ['admin', 'warehouse_staff'] },
    { icon: TrendingUp, label: 'Stock Movement', href: '/dashboard/stock', roles: ['admin', 'warehouse_staff'] },
    { icon: FolderKanban, label: 'Projects', href: '/dashboard/projects', roles: ['admin', 'project_manager', 'gatepass_staff'] },
    { icon: FileText, label: 'Gate Pass', href: '/dashboard/gatepass', roles: ['admin', 'gatepass_staff', 'warehouse_staff'] },
    { icon: ShoppingCart, label: 'Purchase Orders', href: '/dashboard/purchase-orders', roles: ['admin', 'warehouse_staff'] },
    { icon: Users, label: 'Suppliers', href: '/dashboard/suppliers', roles: ['admin', 'warehouse_staff'] },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 space-y-4">
            <div className="flex justify-end items-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Inventory Management
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.fullName}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                      {item.label}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {'description' in item ? item.description : `Manage ${item.label.toLowerCase()}`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.activeProjects}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <FolderKanban className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Gate Passes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '...' : stats.pendingGatePasses}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
