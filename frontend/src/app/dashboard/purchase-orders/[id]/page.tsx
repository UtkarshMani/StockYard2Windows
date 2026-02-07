'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BackButton from '@/components/back-button';
import { Package, Calendar, FileText, CheckCircle, XCircle, Clock, Printer } from 'lucide-react';
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
  notes?: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    receivedQuantity: number;
    item: { id: string; name: string; barcode: string; unitOfMeasurement: string };
  }>;
  createdAt: string;
  creator?: { id: string; fullName: string; email: string };
}

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPurchaseOrder();
    }
  }, [params.id]);

  const fetchPurchaseOrder = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/purchase-orders/${params.id}`);
      setPurchaseOrder(response.data.data);
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      toast.error('Failed to load purchase order');
      router.push('/dashboard/purchase-orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      received: { label: 'Received', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      partial: { label: 'Partial', className: 'bg-orange-100 text-orange-800', icon: Clock },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Purchase order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Hidden on print */}
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/purchase-orders" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Purchase Order Details</h1>
                  <p className="text-gray-600 mt-1">View purchase order information</p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* PO Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 print:border-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">PO Number</label>
                    <p className="text-base text-gray-900 font-semibold">{purchaseOrder.poNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(purchaseOrder.status)}</div>
                  </div>
                  {purchaseOrder.project && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Project</label>
                      <p className="text-base text-gray-900">{purchaseOrder.project.name}</p>
                      <p className="text-sm text-gray-500">{purchaseOrder.project.projectCode}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Dates</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Order Date</label>
                    <p className="text-base text-gray-900">
                      {new Date(purchaseOrder.orderDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  {purchaseOrder.expectedDeliveryDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                      <p className="text-base text-gray-900">
                        {new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {purchaseOrder.actualDeliveryDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Actual Delivery</label>
                      <p className="text-base text-gray-900">
                        {new Date(purchaseOrder.actualDeliveryDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {purchaseOrder.creator && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created By</label>
                      <p className="text-base text-gray-900">{purchaseOrder.creator.fullName}</p>
                      <p className="text-sm text-gray-500">{purchaseOrder.creator.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden print:border-0">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barcode
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.item.barcode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {Number(item.quantity).toFixed(2)} {item.item.unitOfMeasurement}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {purchaseOrder.notes && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 print:border-0">
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{purchaseOrder.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
