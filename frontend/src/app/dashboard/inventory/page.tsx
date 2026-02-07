'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/back-button';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Upload,
  BarChart,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Item {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId?: string;
  brand?: string;
  unitOfMeasurement: string;
  currentQuantity: number;
  minStockLevel: number;
  maxStockLevel?: number;
  unitCost?: number;
  sellingPrice?: number;
  location?: string;
  isActive: boolean;
  category?: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [pagination.page, searchTerm, selectedCategory, refreshTrigger]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('categoryId', selectedCategory);

      const response = await api.get(`/items?${params}`);
      setItems(response.data.data.items);
      setPagination(response.data.data.pagination);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      const categoriesData = response.data.data.categories || [];
      
      // Remove duplicates based on ID
      const uniqueCategories = categoriesData.filter((category: any, index: number, self: any[]) =>
        index === self.findIndex((c: any) => c.id === category.id)
      );
      
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/items/${id}`);
      // Immediately remove from state
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      toast.success('Item deleted successfully');
      // Also trigger full refresh to update counts
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const getLowStockItems = () => {
    return items.filter((item) => Number(item.currentQuantity) <= Number(item.minStockLevel));
  };

  const getStockStatus = (item: Item) => {
    const qty = Number(item.currentQuantity);
    const min = Number(item.minStockLevel);
    const max = item.maxStockLevel ? Number(item.maxStockLevel) : null;

    if (qty === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    if (qty <= min) return { label: 'Low Stock', color: 'text-orange-600 bg-orange-50' };
    if (max && qty >= max) return { label: 'Overstocked', color: 'text-blue-600 bg-blue-50' };
    return { label: 'In Stock', color: 'text-green-600 bg-green-50' };
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
                <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage and track your inventory items
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/inventory/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
              </div>
              <Package className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
              <Filter className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-600">{getLowStockItems().length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{items.reduce((sum, item) => sum + (Number(item.unitCost || 0) * Number(item.currentQuantity)), 0).toFixed(2)}
                </p>
              </div>
              <BarChart className="w-10 h-10 text-green-600 opacity-50" />
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
                placeholder="Search by name, barcode, or brand..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {/* Items Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory
                ? 'Try adjusting your filters'
                : 'Get started by adding your first item'}
            </p>
            {!searchTerm && !selectedCategory && (
              <button
                onClick={() => router.push('/dashboard/inventory/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                        Barcode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                            <span className="text-sm font-mono font-semibold text-blue-900">
                              {item.barcode}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.name}
                                </div>
                                {item.brand && (
                                  <div className="text-sm text-gray-500">{item.brand}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {item.category?.name || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {Number(item.currentQuantity).toFixed(2)} {item.unitOfMeasurement}
                            </div>
                            <div className="text-xs text-gray-500">
                              Min: {Number(item.minStockLevel).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.unitCost ? `₹${Number(item.unitCost).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.location || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => router.push(`/dashboard/inventory/${item.id}`)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.name)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === pagination.pages ||
                          Math.abs(page - pagination.page) <= 1
                      )
                      .map((page, index, array) => (
                        <>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span key={`ellipsis-${page}`} className="px-2">
                              ...
                            </span>
                          )}
                          <button
                            key={page}
                            onClick={() =>
                              setPagination((prev) => ({ ...prev, page }))
                            }
                            className={`px-4 py-2 border rounded-lg ${
                              pagination.page === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        </>
                      ))}
                  </div>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
