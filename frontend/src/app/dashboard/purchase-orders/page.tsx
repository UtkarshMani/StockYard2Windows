'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/back-button';
import { Package, Plus, FileText, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier?: { id: string; name: string; supplierCode: string } | null;
  project?: { id: string; name: string; projectCode: string };
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQuantity: number;
    item: { id: string; name: string; barcode: string };
  }>;
  createdAt: string;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchPurchaseOrders();
  }, [filter]);

  const fetchPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/purchase-orders', { params });
      setPurchaseOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async (po: PurchaseOrder) => {
    try {
      toast.loading('Generating PDF...');
      
      // Fetch full purchase order details with items
      const response = await api.get(`/purchase-orders/${po.id}`);
      const fullPOData = response.data.data;
      
      if (!fullPOData) {
        throw new Error('Failed to fetch purchase order data');
      }
      
      // Dynamically import react-pdf renderer
      const { pdf } = await import('@react-pdf/renderer');
      const { PurchaseOrderPDFDocument } = await import('@/components/PurchaseOrderPDF');
      
      // Generate PDF blob
      const blob = await pdf(<PurchaseOrderPDFDocument purchaseOrder={fullPOData} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fullPOData.poNumber || 'purchase-order'}_PO.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to download PDF');
    }
  };

  const handlePreview = (po: PurchaseOrder) => {
    router.push(`/dashboard/purchase-orders/${po.id}`);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      partial: 'bg-orange-100 text-orange-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      partial: Package,
      received: CheckCircle,
      cancelled: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
                  <p className="text-gray-600 mt-1">Manage purchase orders and inventory receipts</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/purchase-orders/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Purchase Order
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'partial', 'received', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Orders List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading purchase orders...</p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Purchase Orders Found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' ? 'Create your first purchase order to get started' : `No ${filter} purchase orders`}
            </p>
            <button
              onClick={() => router.push('/dashboard/purchase-orders/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Purchase Order
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {po.project ? (
                          <div>
                            <div className="text-sm text-gray-900">{po.project.name}</div>
                            <div className="text-xs text-gray-500">{po.project.projectCode}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(po.orderDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{Number(po.totalAmount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(po)}
                            className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                            title="Preview Purchase Order"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">Preview</span>
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(po)}
                            className="flex items-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-sm font-medium">PDF</span>
                          </button>
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
