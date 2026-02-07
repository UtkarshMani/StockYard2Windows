'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/back-button';
import {
  FileText,
  Plus,
  Search,
  Download,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface GatePass {
  id: string;
  gatePassNumber: string;
  projectId: string;
  gatePassDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt: string;
  project: {
    name: string;
    projectCode: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export default function GatePassPage() {
  const router = useRouter();
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchGatePasses();
  }, [statusFilter]);

  const fetchGatePasses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/gatepass?${params}`);
      const gatePassesData = response.data.data?.gatePasses || response.data.data || response.data || [];
      setGatePasses(Array.isArray(gatePassesData) ? gatePassesData : []);
    } catch (error: any) {
      console.error('GatePass fetch error:', error);
      // Don't show error toast if it's just an empty result
      if (error.response?.status !== 404) {
        toast.error(error.response?.data?.message || 'Failed to fetch gatePasses');
      }
      setGatePasses([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGatePasses = gatePasses.filter(
    (gatepass) =>
      gatepass.gatePassNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gatepass.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gatepass.project.projectCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-700' },
      billed: { label: 'Billed', color: 'bg-blue-50 text-blue-700' },
      paid: { label: 'Paid', color: 'bg-green-50 text-green-700' },
      partial: { label: 'Partial', color: 'bg-orange-50 text-orange-700' },
      overdue: { label: 'Overdue', color: 'bg-red-50 text-red-700' },
      cancelled: { label: 'Cancelled', color: 'bg-gray-50 text-gray-700' },
    };
    const config = statusConfig[status] || statusConfig.billed;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleDownloadPDF = async (gatepass: GatePass) => {
    try {
      toast.loading('Generating PDF...');
      
      // Fetch full gatepass details with items
      const response = await api.get(`/gatepass/${gatepass.id}`);
      const fullGatePassData = response.data.data?.gatePass || response.data.data || response.data;
      
      console.log('Full gatepass data for PDF:', fullGatePassData);
      
      if (!fullGatePassData) {
        throw new Error('Failed to fetch gate pass data');
      }
      
      // Dynamically import react-pdf renderer
      const { pdf } = await import('@react-pdf/renderer');
      const { GatePassPDFDocument } = await import('@/components/GatePassPDF');
      
      // Generate PDF blob
      const blob = await pdf(<GatePassPDFDocument gatepass={fullGatePassData} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fullGatePassData.gatePassNumber || 'gatepass'}_Invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('PDF generation error:', error);
      console.error('Error details:', error.message, error.stack);
      toast.dismiss();
      toast.error(error.message || 'Failed to download PDF');
    }
  };

  const handlePreview = (gatepass: GatePass) => {
    router.push(`/dashboard/gatepass/${gatepass.id}/preview`);
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
                <h1 className="text-3xl font-bold text-gray-900">GatePass</h1>
                <p className="text-gray-600 mt-1">
                  Manage invoices and gatepass records
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/gatepass/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Gate Pass
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6 max-w-sm">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Gate Passes</p>
                <p className="text-2xl font-bold text-gray-900">{gatePasses.length}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-600 opacity-50" />
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
                placeholder="Search gatePasses..."
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
              <option value="billed">Billed</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* GatePasss Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading gatePasses...</p>
          </div>
        ) : filteredGatePasses.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No gatePasses found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by creating your first gate pass'}
            </p>
            {!searchTerm && !statusFilter && (
              <button
                onClick={() => router.push('/dashboard/gatepass/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create First Gate Pass
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gate Pass Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGatePasses.map((gatepass) => (
                    <tr key={gatepass.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {gatepass.gatePassNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {gatepass.project.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {gatepass.project.projectCode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(gatepass.gatePassDate).toLocaleDateString()}
                        </div>
                        {gatepass.dueDate && (
                          <div className="text-xs text-gray-500">
                            Due: {new Date(gatepass.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ₹{Number(gatepass.totalAmount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          Tax: ₹{Number(gatepass.taxAmount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(gatepass.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(gatepass)}
                            className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                            title="Preview Gate Pass"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">Preview</span>
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(gatepass)}
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
