'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BackButton from '@/components/back-button';
import {
  Users,
  Save,
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  taxId: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function NewSupplierPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const onSubmit = async (data: SupplierFormData) => {
    setIsLoading(true);
    try {
      const supplierData = {
        name: data.name,
        contactPerson: data.contactPerson || undefined,
        email: data.email || undefined,
        phone: data.phone,
        address: data.address || undefined,
        paymentTerms: data.paymentTerms || undefined,
        taxId: data.taxId || undefined,
      };

      await api.post('/suppliers', supplierData);
      toast.success('Supplier created successfully!');
      router.push('/dashboard/suppliers');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create supplier';
      toast.error(message);
      console.error('Supplier creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push('/dashboard/suppliers');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/suppliers" />
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">New Supplier</h1>
                <p className="text-gray-600 mt-1">
                  Add a new supplier to your network
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-600" />
              Basic Information
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  placeholder="e.g., ABC Electrical Supplies"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    {...register('contactPerson')}
                    type="text"
                    id="contactPerson"
                    placeholder="e.g., John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactPerson.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...register('phone')}
                      type="tel"
                      id="phone"
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    placeholder="supplier@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <textarea
                    {...register('address')}
                    id="address"
                    rows={3}
                    placeholder="Enter complete address..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Business Details
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID / VAT Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('taxId')}
                    type="text"
                    id="taxId"
                    placeholder="e.g., 12-3456789"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.taxId && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxId.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  {...register('paymentTerms')}
                  id="paymentTerms"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select payment terms</option>
                  <option value="Net 15">Net 15 (Due in 15 days)</option>
                  <option value="Net 30">Net 30 (Due in 30 days)</option>
                  <option value="Net 45">Net 45 (Due in 45 days)</option>
                  <option value="Net 60">Net 60 (Due in 60 days)</option>
                  <option value="Net 90">Net 90 (Due in 90 days)</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                  <option value="Advance Payment">Advance Payment</option>
                  <option value="2/10 Net 30">2/10 Net 30 (2% discount if paid in 10 days)</option>
                </select>
                {errors.paymentTerms && (
                  <p className="mt-1 text-sm text-red-600">{errors.paymentTerms.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Note</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• A unique supplier code will be automatically generated</li>
              <li>• The supplier will be created as active by default</li>
              <li>• You can edit or deactivate the supplier later</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Creating...' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
