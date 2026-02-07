'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BackButton from '@/components/back-button';
import { FileText, Download, Printer } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface GatePassItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  item: {
    id: string;
    name: string;
    barcode: string;
    unitOfMeasurement: string;
  };
}

interface GatePass {
  id: string;
  gatePassNumber: string;
  projectId: string;
  gatePassDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt: string;
  project?: {
    id: string;
    name: string;
    projectCode: string;
    siteAddress?: string;
  };
  items: GatePassItem[];
}

export default function GatePassPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const [gatepass, setGatePass] = useState<GatePass | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchGatePass(params.id as string);
    }
  }, [params.id]);

  const fetchGatePass = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/gatepass/${id}`);
      const gatepassData = response.data.data?.gatePass || response.data.data || response.data;
      console.log('Fetched gatepass data:', gatepassData);
      setGatePass(gatepassData);
    } catch (error: any) {
      console.error('GatePass fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch gatepass');
      router.push('/dashboard/gatepass');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!gatepass) return;
    
    try {
      setDownloading(true);
      toast.loading('Generating PDF...');
      
      console.log('Generating PDF with data:', gatepass);
      
      // Dynamically import react-pdf renderer
      const { pdf } = await import('@react-pdf/renderer');
      const { GatePassPDFDocument } = await import('@/components/GatePassPDF');
      
      // Generate PDF blob
      const blob = await pdf(<GatePassPDFDocument gatepass={gatepass} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${gatepass.gatePassNumber || 'gatepass'}_Invoice.pdf`;
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
      toast.error(error.message || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading gatepass details...</p>
        </div>
      </div>
    );
  }

  if (!gatepass) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">GatePass not found</h3>
          <button
            onClick={() => router.push('/dashboard/gatepass')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to GatePasss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\:hidden {
            display: none !important;
          }
          .print\:border-0 {
            border: 0 !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>

      {/* Header - Hidden when printing */}
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/gatepass" />
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gate Pass Preview</h1>
                <p className="text-gray-600 mt-1">
                  {gatepass.gatePassNumber}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Invoice Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 print:border-0">
          {/* Invoice Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Gate Pass Number</p>
                <p className="text-lg font-semibold text-gray-900 font-mono">{gatepass.gatePassNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-blue-50 text-blue-700">
                  {gatepass.status?.toUpperCase() || 'BILLED'}
                </span>
              </div>
            </div>
          </div>

          {/* Project & Date Information */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Billed To</h3>
              {gatepass.project ? (
                <>
                  <p className="text-lg font-bold text-gray-900">{gatepass.project.name}</p>
                  <p className="text-sm text-gray-600 font-mono">{gatepass.project.projectCode}</p>
                  {gatepass.project.siteAddress && (
                    <p className="text-sm text-gray-600 mt-2">{gatepass.project.siteAddress}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-500 italic">No project assigned</p>
              )}
            </div>
            <div className="text-right">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Gate Pass Date</p>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(gatepass.gatePassDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {gatepass.dueDate && (
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(gatepass.dueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 text-sm font-semibold text-gray-700 uppercase">Item</th>
                  <th className="text-center py-3 text-sm font-semibold text-gray-700 uppercase">Quantity</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase">Unit Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {gatepass.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.item.name}</p>
                        <p className="text-sm text-gray-500">{item.item.barcode}</p>
                      </div>
                    </td>
                    <td className="py-4 text-center text-gray-900">
                      {item.quantity} {item.item.unitOfMeasurement}
                    </td>
                    <td className="py-4 text-right text-gray-900">
                      ₹{Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-4 text-right font-semibold text-gray-900">
                      ₹{Number(item.totalPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="flex justify-between py-2 text-gray-700">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{Number(gatepass.subtotal).toFixed(2)}</span>
              </div>
              {gatepass.taxAmount > 0 && (
                <div className="flex justify-between py-2 text-gray-700">
                  <span>Tax:</span>
                  <span className="font-semibold">₹{Number(gatepass.taxAmount).toFixed(2)}</span>
                </div>
              )}
              {gatepass.discountAmount > 0 && (
                <div className="flex justify-between py-2 text-gray-700">
                  <span>Discount:</span>
                  <span className="font-semibold text-red-600">-₹{Number(gatepass.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-gray-300 text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span>₹{Number(gatepass.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {gatepass.notes && (
            <div className="pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{gatepass.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
