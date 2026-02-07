'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/back-button';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Phone,
  Mail,
  MapPin,
  Building,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  taxId?: string;
  isActive: boolean;
  createdAt: string;
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, [showActiveOnly]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showActiveOnly) params.append('isActive', 'true');

      const response = await api.get(`/suppliers?${params}`);
      setSuppliers(response.data.data.suppliers || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;

    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/suppliers/${id}`, { isActive: !isActive });
      toast.success(`Supplier ${isActive ? 'deactivated' : 'activated'} successfully`);
      fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard" />
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
                <p className="text-gray-600 mt-1">
                  Manage supplier relationships and contacts
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/suppliers/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
              </div>
              <Users className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600">
                  {suppliers.filter((s) => s.isActive).length}
                </p>
              </div>
              <Building className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive Suppliers</p>
                <p className="text-2xl font-bold text-gray-600">
                  {suppliers.filter((s) => !s.isActive).length}
                </p>
              </div>
              <Building className="w-10 h-10 text-gray-600 opacity-50" />
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
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Active only</span>
            </label>
          </div>
        </div>

        {/* Suppliers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading suppliers...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No suppliers found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || showActiveOnly
                ? 'Try adjusting your filters'
                : 'Get started by adding your first supplier'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/dashboard/suppliers/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Supplier
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${
                  supplier.isActive ? 'border-gray-200' : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {supplier.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-mono">{supplier.supplierCode}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      supplier.isActive
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {supplier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {supplier.contactPerson && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-600 truncate">{supplier.contactPerson}</p>
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-600 truncate">{supplier.email}</p>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{supplier.phone}</p>
                    </div>
                  )}

                  {supplier.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 line-clamp-2">{supplier.address}</p>
                    </div>
                  )}

                  {supplier.paymentTerms && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Payment Terms</p>
                      <p className="text-sm text-gray-700">{supplier.paymentTerms}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push(`/dashboard/suppliers/${supplier.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(supplier.id, supplier.isActive)}
                    className={`px-3 py-2 border rounded-lg text-sm ${
                      supplier.isActive
                        ? 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                        : 'border-green-300 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {supplier.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id, supplier.name)}
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
