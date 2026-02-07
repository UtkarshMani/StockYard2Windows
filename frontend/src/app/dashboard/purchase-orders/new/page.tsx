'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BackButton from '@/components/back-button';
import {
  Package,
  Save,
  X,
  Plus,
  Trash2,
  FolderKanban,
  Calendar,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const purchaseOrderItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative().optional().default(0),
  totalPrice: z.number().nonnegative().optional().default(0),
});

const purchaseOrderSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
  totalAmount: z.number().nonnegative().optional().default(0),
  taxAmount: z.number().optional().default(0),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface Project {
  id: string;
  name: string;
  projectCode: string;
}

interface Item {
  id: string;
  name: string;
  barcode: string;
  unitCost?: number;
  unitOfMeasurement: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      items: [{ itemId: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
      orderDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      taxAmount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, itemsRes] = await Promise.all([
          api.get('/projects'),
          api.get('/items'),
        ]);

        const projectsData = projectsRes.data.data?.projects || projectsRes.data.data || [];
        const itemsData = itemsRes.data.data?.items || itemsRes.data.data || [];

        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setItems(Array.isArray(itemsData) ? itemsData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
        setProjects([]);
        setItems([]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: PurchaseOrderFormData) => {
    setIsLoading(true);
    try {
      const purchaseOrderData = {
        supplierId: null,
        projectId: data.projectId,
        orderDate: new Date(data.orderDate).toISOString(),
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          itemId: item.itemId,
          quantity: Number(item.quantity),
          unitPrice: 0,
          totalPrice: 0,
        })),
        totalAmount: 0,
        taxAmount: 0,
      };

      console.log('Submitting purchase order:', purchaseOrderData);
      await api.post('/purchase-orders', purchaseOrderData);
      toast.success('Purchase order created successfully!');
      router.push('/dashboard/purchase-orders');
    } catch (error: any) {
      console.error('Purchase order creation error:', error);
      console.error('Error response:', error.response?.data);
      
      // Get detailed error message
      let errorMessage = 'Failed to create purchase order';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push('/dashboard/purchase-orders');
    }
  };

  const handleAddItem = () => {
    append({ itemId: '', quantity: 1, unitPrice: 0, totalPrice: 0 });
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/purchase-orders" />
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">New Purchase Order</h1>
                <p className="text-gray-600 mt-1">Create a new purchase order</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Order Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-600" />
              Order Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FolderKanban className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    {...register('projectId')}
                    id="projectId"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.projectCode})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.projectId && (
                  <p className="mt-1 text-sm text-red-600">{errors.projectId.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('orderDate')}
                    type="date"
                    id="orderDate"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.orderDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.orderDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                Order Items
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const selectedItem = items.find((item) => item.id === field.itemId);

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    {/* Item Selection */}
                    <div className="md:col-span-10">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register(`items.${index}.itemId`)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.barcode})
                          </option>
                        ))}
                      </select>
                      {errors.items?.[index]?.itemId && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.items[index]?.itemId?.message}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...register(`items.${index}.quantity`, { 
                          valueAsNumber: true
                        })}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {selectedItem && (
                        <p className="mt-1 text-xs text-gray-500">{selectedItem.unitOfMeasurement}</p>
                      )}
                      {errors.items?.[index]?.quantity && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    {/* Delete Button */}
                    <div className="md:col-span-1 flex items-end">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.items && (
              <p className="mt-2 text-sm text-red-600">
                {Array.isArray(errors.items) ? 'Please fix the errors above' : errors.items.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Notes
            </h2>
            <textarea
              {...register('notes')}
              rows={4}
              placeholder="Add any additional notes or instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              {isLoading ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
