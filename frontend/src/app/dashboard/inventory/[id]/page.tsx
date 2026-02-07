'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BackButton from '@/components/back-button';
import {
  Package,
  Save,
  Trash2,
  Barcode,
  Tag,
  DollarSign,
  MapPin,
  Image as ImageIcon,
  Hash,
  Boxes,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import DynamicAttributeFields from '@/components/DynamicAttributeFields';

const itemSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  unitOfMeasurement: z.string().min(1, 'Unit of measurement is required'),
  currentQuantity: z.number().min(0, 'Current quantity must be 0 or greater'),
  minStockLevel: z.number().min(0, 'Min stock level must be 0 or greater'),
  maxStockLevel: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  unitCost: z.union([z.number().min(0), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
  location: z.string().optional(),
  imageFile: z.any().optional(),
  existingImageUrl: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface Category {
  id: string;
  name: string;
}

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [attributeValues, setAttributeValues] = useState<Array<{ attributeId: string; value: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    fetchCategories();
    fetchItem();
  }, [itemId]);

  const fetchItem = async () => {
    try {
      setIsFetching(true);
      const response = await api.get(`/items/${itemId}`);
      const item = response.data.data.item;
      
      // Set category ID for dynamic fields
      setSelectedCategoryId(item.categoryId || '');
      
      // Load existing attribute values
      if (item.attributeValues && item.attributeValues.length > 0) {
        const attrs = item.attributeValues.map((av: any) => ({
          attributeId: av.attributeId,
          value: av.value,
        }));
        setAttributeValues(attrs);
      }
      
      // Reset form with fetched data
      reset({
        barcode: item.barcode,
        name: item.name,
        description: item.description || '',
        categoryId: item.categoryId || '',
        brand: item.brand || '',
        unitOfMeasurement: item.unitOfMeasurement,
        currentQuantity: Number(item.currentQuantity),
        minStockLevel: Number(item.minStockLevel),
        maxStockLevel: item.maxStockLevel ? Number(item.maxStockLevel) : undefined,
        unitCost: item.unitCost ? Number(item.unitCost) : undefined,
        location: item.location || '',
        existingImageUrl: item.imageUrl || '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch item');
      router.push('/dashboard/inventory');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      const categoriesData = Array.isArray(response.data)
        ? response.data
        : response.data?.data?.categories || [];
      
      const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
      const uniqueCategories = categoriesArray.filter((category, index, self) =>
        index === self.findIndex((c) => c.id === category.id)
      );
      
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const onSubmit = async (data: ItemFormData) => {
    setIsLoading(true);
    try {
      // Handle file upload if provided
      let imageUrl = data.existingImageUrl;
      if (data.imageFile && data.imageFile[0]) {
        const file = data.imageFile[0];
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const itemData = {
        barcode: data.barcode,
        name: data.name,
        description: data.description || undefined,
        categoryId: data.categoryId || undefined,
        brand: data.brand || undefined,
        unitOfMeasurement: data.unitOfMeasurement,
        currentQuantity: data.currentQuantity,
        minStockLevel: data.minStockLevel,
        maxStockLevel: data.maxStockLevel || undefined,
        unitCost: data.unitCost || undefined,
        location: data.location || undefined,
        imageUrl: imageUrl || undefined,
        attributes: attributeValues.length > 0 ? attributeValues : undefined,
      };

      await api.put(`/items/${itemId}`, itemData);
      toast.success('Item updated successfully');
      router.push('/dashboard/inventory');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/items/${itemId}`);
      toast.success('Item deleted successfully');
      router.push('/dashboard/inventory');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading item...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard/inventory" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Edit Item</h1>
                  <p className="text-sm text-gray-600">Update item details</p>
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-5 w-5" />
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-gray-600" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Barcode */}
              <div>
                <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                  Barcode <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('barcode')}
                    type="text"
                    id="barcode"
                    placeholder="Enter or scan barcode"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.barcode && (
                  <p className="mt-1 text-sm text-red-600">{errors.barcode.message}</p>
                )}
              </div>

              {/* Item Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  placeholder="Enter item name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  {...register('categoryId')}
                  id="categoryId"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingCategories}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setAttributeValues([]); // Clear attributes when category changes
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <input
                  {...register('brand')}
                  type="text"
                  id="brand"
                  placeholder="e.g., Bosch, Makita"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  id="description"
                  rows={3}
                  placeholder="Enter item description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Dynamic Category-Specific Attributes */}
            <DynamicAttributeFields
              categoryId={selectedCategoryId || null}
              values={attributeValues}
              onChange={setAttributeValues}
            />
          </div>

          {/* Measurement & Stock */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-gray-600" />
              Measurement & Stock Levels
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unit of Measurement */}
              <div>
                <label htmlFor="unitOfMeasurement" className="block text-sm font-medium text-gray-700 mb-2">
                  Unit of Measurement <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('unitOfMeasurement')}
                  id="unitOfMeasurement"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="l">Liters (l)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="m">Meters (m)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="dozen">Dozen</option>
                </select>
                {errors.unitOfMeasurement && (
                  <p className="mt-1 text-sm text-red-600">{errors.unitOfMeasurement.message}</p>
                )}
              </div>

              {/* Current Stock Level */}
              <div>
                <label htmlFor="currentQuantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Stock Level <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('currentQuantity', { valueAsNumber: true })}
                    type="number"
                    id="currentQuantity"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.currentQuantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentQuantity.message}</p>
                )}
              </div>

              {/* Min Stock Level */}
              <div>
                <label htmlFor="minStockLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Min Stock Level <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('minStockLevel', { valueAsNumber: true })}
                    type="number"
                    id="minStockLevel"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.minStockLevel && (
                  <p className="mt-1 text-sm text-red-600">{errors.minStockLevel.message}</p>
                )}
              </div>

              {/* Max Stock Level */}
              <div>
                <label htmlFor="maxStockLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Stock Level
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('maxStockLevel', { valueAsNumber: true })}
                    type="number"
                    id="maxStockLevel"
                    min="0"
                    step="1"
                    placeholder="Optional"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Location */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              ₹ Pricing & Location
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unit Cost */}
              <div>
                <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                  <input
                    {...register('unitCost', { valueAsNumber: true })}
                    type="number"
                    id="unitCost"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('location')}
                    type="text"
                    id="location"
                    placeholder="e.g., Warehouse A, Shelf B3"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Image File */}
              <div className="md:col-span-2">
                <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Image
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('imageFile')}
                    type="file"
                    id="imageFile"
                    accept="image/*"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Upload a new image to replace the existing one</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.push('/dashboard/inventory')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              <Save className="w-5 h-5" />
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
