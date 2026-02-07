'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/back-button';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  User,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface StockMovement {
  id: string;
  itemId: string;
  movementType: string;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  locationFrom?: string;
  locationTo?: string;
  notes?: string;
  createdAt: string;
  item: {
    name: string;
    barcode: string;
    unitOfMeasurement: string;
  };
  performer: {
    fullName: string;
    email: string;
  };
  project?: {
    name: string;
    projectCode: string;
  };
}

export default function StockMovementPage() {
  const router = useRouter();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchMovements();
  }, [typeFilter, dateFrom, dateTo]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.append('movementType', typeFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await api.get(`/stock/movements?${params}`);
      setMovements(response.data.data.movements || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch stock movements');
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((movement) =>
    movement.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movement.item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movement.performer.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'stock_out':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-blue-600" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'stock_in':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">Stock In</span>;
      case 'stock_out':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700">Stock Out</span>;
      case 'adjustment':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">Adjustment</span>;
      case 'transfer':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700">Transfer</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-700">{type}</span>;
    }
  };

  const totalIn = movements
    .filter((m) => m.movementType === 'stock_in')
    .reduce((sum, m) => sum + Number(m.quantity), 0);

  const totalOut = movements
    .filter((m) => m.movementType === 'stock_out')
    .reduce((sum, m) => sum + Number(m.quantity), 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Movement</h1>
              <p className="text-gray-600 mt-1">
                Track all inventory movements and transactions
              </p>
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
                <p className="text-sm text-gray-600">Total Movements</p>
                <p className="text-2xl font-bold text-gray-900">{movements.length}</p>
              </div>
              <Package className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock In</p>
                <p className="text-2xl font-bold text-green-600">{totalIn.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Out</p>
                <p className="text-2xl font-bold text-red-600">{totalOut.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-10 h-10 text-red-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search movements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="stock_in">Stock In</option>
              <option value="stock_out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
              <option value="transfer">Transfer</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="From Date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="To Date"
            />
          </div>
        </div>

        {/* Movements List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading movements...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No movements found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movementType)}
                          <div className="text-sm text-gray-900">
                            {new Date(movement.createdAt).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(movement.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {movement.item.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {movement.item.barcode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getMovementBadge(movement.movementType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          movement.movementType === 'stock_in' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.movementType === 'stock_in' ? '+' : '-'}
                          {Number(movement.quantity).toFixed(2)} {movement.item.unitOfMeasurement}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{movement.performer.fullName}</div>
                        <div className="text-xs text-gray-500">{movement.performer.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {movement.project ? (
                          <div>
                            <div className="text-sm text-gray-900">{movement.project.name}</div>
                            <div className="text-xs text-gray-500">{movement.project.projectCode}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {movement.notes || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
