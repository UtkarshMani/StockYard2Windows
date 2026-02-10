'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import BackButton from '@/components/back-button';
import {
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  FolderKanban,
  Calendar,
  Package,
  DollarSign,
  ScanLine,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const gatepassItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
});

const gatepassSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  gatePassDate: z.string().min(1, 'Gate Pass date is required'),
  items: z.array(gatepassItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

type GatePassFormData = z.infer<typeof gatepassSchema>;

interface Project {
  id: string;
  name: string;
  projectCode: string;
}

interface Item {
  id: string;
  name: string;
  barcode: string;
  sellingPrice?: number;
  unitOfMeasurement: string;
  currentQuantity?: number;
}

interface PendingItem {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  availableStock?: number;
}

export default function NewGatePassPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanQuantity, setScanQuantity] = useState(1);
  const [scanningEnabled, setScanningEnabled] = useState(false);
  const [scannedItemIds, setScannedItemIds] = useState<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [stockChecking, setStockChecking] = useState<{ [key: string]: boolean }>({});
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastErrorToastRef = useRef<{ message: string; timestamp: number } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GatePassFormData>({
    resolver: zodResolver(gatepassSchema),
    defaultValues: {
      items: [],
      gatePassDate: new Date().toISOString().split('T')[0],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedProjectId = watch('projectId');

  // Auto-focus on barcode input when scanning is enabled
  useEffect(() => {
    if (scanningEnabled && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scanningEnabled]);

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

  const calculateTotal = () => {
    return watchedItems.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + quantity * unitPrice;
    }, 0);
  };

  const onSubmit = async (data: GatePassFormData) => {
    // Check for pending items
    if (pendingItems.length > 0) {
      toast.error(`You have ${pendingItems.length} pending item(s). Please add them to the gate pass or remove them before creating the gatepass.`);
      return;
    }

    setIsLoading(true);
    
    const totalAmount = calculateTotal();

    // Create gatepass with multiple items
    const gatepassData = {
      projectId: data.projectId,
      gatePassDate: new Date(data.gatePassDate).toISOString(),
      subtotal: totalAmount,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount,
      items: data.items.map((item) => ({
        itemId: item.itemId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.quantity) * Number(item.unitPrice),
      })),
      notes: data.notes || undefined,
    };
    
    try {
      await api.post('/gatepass/bulk', gatepassData);
      toast.success('GatePass created successfully!');
      router.push('/dashboard/gatepass');
    } catch (error: any) {
      console.error('GatePass creation error:', error);
      console.error('Error response:', error.response);
      console.error('GatePass data sent:', gatepassData);
      
      let message = 'Failed to create gatepass';
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.message) {
        message = `Error: ${error.message}`;
      }
      
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
    
    // Count the number of errors
    let errorCount = 0;
    const errorMessages: string[] = [];
    
    if (errors.projectId) {
      errorMessages.push('project');
      errorCount++;
    }
    if (errors.gatePassDate) {
      errorMessages.push('gate pass date');
      errorCount++;
    }
    if (errors.items) {
      if (errors.items.message) {
        errorMessages.push('items');
        errorCount++;
      } else if (Array.isArray(errors.items)) {
        const itemErrors = errors.items.filter((item: any) => item).length;
        if (itemErrors > 0) {
          errorMessages.push(`${itemErrors} item(s)`);
          errorCount += itemErrors;
        }
      }
    }
    
    // Build the error message
    const errorMessage = errorMessages.length > 0 
      ? `Please fix errors in: ${errorMessages.join(', ')}`
      : 'Please fill in all required fields correctly';
    
    // Prevent duplicate toasts within 1 second
    const now = Date.now();
    const lastError = lastErrorToastRef.current;
    
    if (!lastError || lastError.message !== errorMessage || now - lastError.timestamp > 1000) {
      toast.error(errorMessage);
      lastErrorToastRef.current = { message: errorMessage, timestamp: now };
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push('/dashboard/gatepass');
    }
  };

  const handleAddItem = () => {
    // Add a new pending item (not directly to gate pass)
    const newPendingItem: PendingItem = {
      id: `pending-${Date.now()}-${Math.random()}`,
      itemId: '',
      quantity: 1,
      unitPrice: 0,
    };
    setPendingItems(prev => [...prev, newPendingItem]);
  };

  const checkStockAvailability = async (itemId: string, quantity: number): Promise<{ available: boolean; currentStock: number }> => {
    try {
      const response = await api.get(`/items/${itemId}`);
      const itemData = response.data.data?.item || response.data.data;
      const currentStock = Number(itemData.currentQuantity) || 0;
      
      return {
        available: currentStock >= quantity,
        currentStock
      };
    } catch (error) {
      console.error('Error checking stock:', error);
      return { available: false, currentStock: 0 };
    }
  };

  const handlePendingItemChange = (pendingId: string, field: 'itemId' | 'quantity' | 'unitPrice', value: any) => {
    setPendingItems(prev => prev.map(item => {
      if (item.id === pendingId) {
        const updated = { ...item, [field]: value };
        
        // If item changed, auto-populate price
        if (field === 'itemId') {
          const selectedItem = items.find(i => i.id === value);
          if (selectedItem) {
            const sellingPrice = Number(selectedItem.sellingPrice) || 0;
            updated.unitPrice = sellingPrice;
            updated.availableStock = selectedItem.currentQuantity;
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleAddPendingToGatePass = async (pendingItem: PendingItem) => {
    if (!pendingItem.itemId) {
      toast.error('Please select an item');
      return;
    }

    if (pendingItem.quantity <= 0) {
      toast.error('Quantity must be positive');
      return;
    }

    if (pendingItem.unitPrice < 0) {
      toast.error('Unit price cannot be negative');
      return;
    }

    // Check for duplicates
    const isDuplicate = watchedItems.some(item => item.itemId === pendingItem.itemId);
    if (isDuplicate) {
      toast.error('This item is already in the gate pass. Remove it first to add again.');
      return;
    }

    // Check stock availability
    setStockChecking(prev => ({ ...prev, [pendingItem.id]: true }));
    const stockCheck = await checkStockAvailability(pendingItem.itemId, pendingItem.quantity);
    setStockChecking(prev => ({ ...prev, [pendingItem.id]: false }));

    if (!stockCheck.available) {
      toast.error(`Insufficient stock! Available: ${stockCheck.currentStock}, Requested: ${pendingItem.quantity}`);
      return;
    }

    // Add to gate pass
    append({
      itemId: pendingItem.itemId,
      quantity: pendingItem.quantity,
      unitPrice: pendingItem.unitPrice,
    });

    // Remove from pending
    setPendingItems(prev => prev.filter(item => item.id !== pendingItem.id));
    
    const selectedItem = items.find(i => i.id === pendingItem.itemId);
    toast.success(`${selectedItem?.name || 'Item'} added to gate pass`);
  };

  const handleRemovePendingItem = (pendingId: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== pendingId));
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent parent form submission
    if (!barcodeInput.trim()) return;

    if (!watchedProjectId) {
      toast.error('Please select a project first');
      return;
    }

    try {
      // Look up item by barcode
      const itemResponse = await api.get(`/items/barcode/${barcodeInput.trim()}`);
      const scannedItem = itemResponse.data.data?.item || itemResponse.data.data;

      if (!scannedItem || !scannedItem.id) {
        toast.error('Item not found');
        setBarcodeInput('');
        return;
      }

      // Get selling price (allow 0)
      const sellingPrice = Number(scannedItem.sellingPrice) || 0;

      // Check if item already exists in gate pass
      const existingItemIndex = watchedItems.findIndex(
        (item) => item.itemId === scannedItem.id
      );

      if (existingItemIndex !== -1) {
        // Item exists, increment quantity by scanQuantity
        const currentItem = watchedItems[existingItemIndex];
        const newQuantity = Number(currentItem.quantity) + scanQuantity;
        const price = Number(currentItem.unitPrice) || sellingPrice;
        
        // Check stock before updating
        const stockCheck = await checkStockAvailability(scannedItem.id, newQuantity);
        if (!stockCheck.available) {
          toast.error(`Insufficient stock! Available: ${stockCheck.currentStock}, Requested: ${newQuantity}`);
          setBarcodeInput('');
          return;
        }
        
        update(existingItemIndex, {
          itemId: scannedItem.id,
          quantity: newQuantity,
          unitPrice: price,
        });
        
        console.log('Updated item:', scannedItem.name, 'new quantity:', newQuantity);
        toast.success(`${scannedItem.name} quantity increased to ${newQuantity}`);
      } else {
        // Check stock before adding new item
        const stockCheck = await checkStockAvailability(scannedItem.id, scanQuantity);
        if (!stockCheck.available) {
          toast.error(`Insufficient stock! Available: ${stockCheck.currentStock}, Requested: ${scanQuantity}`);
          setBarcodeInput('');
          return;
        }

        // New item, add to gate pass
        const newItem = {
          itemId: scannedItem.id,
          quantity: scanQuantity,
          unitPrice: sellingPrice,
        };
        
        console.log('Adding new item to gate pass:', scannedItem.name, newItem);
        append(newItem);
        // Track this item as scanned
        setScannedItemIds(prev => new Set(prev).add(scannedItem.id));
        toast.success(`${scannedItem.name} added to gate pass`);
      }

      // Clear barcode input
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    } catch (error: any) {
      // If anything fails, show error and don't modify the gate pass
      const message = error.response?.data?.message || 'Failed to scan item';
      toast.error(message);
      console.error('Barcode scan error:', error);
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            <BackButton fallbackRoute="/dashboard/gatepass" />
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">New GatePass</h1>
                <p className="text-gray-600 mt-1">Create a new gatepass invoice</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
          {/* Gate Pass Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Gate Pass Information
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                <label htmlFor="gatePassDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Gate Pass Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    {...register('gatePassDate')}
                    type="date"
                    id="gatePassDate"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                {errors.gatePassDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.gatePassDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Gate Pass Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                Gate Pass Items
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setScanningEnabled(!scanningEnabled)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    scanningEnabled
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ScanLine className="w-4 h-4" />
                  {scanningEnabled ? 'Scanning Active' : 'Enable Scanning'}
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={scanningEnabled}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    scanningEnabled 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={scanningEnabled ? 'Disable scanning to add items manually' : 'Add item manually'}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>

            {/* Barcode Scanner Section */}
            {scanningEnabled && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <form onSubmit={handleBarcodeSubmit} className="space-y-3">
                  {/* Quantity per Scan */}
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Quantity per Scan
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={scanQuantity}
                        onChange={(e) => setScanQuantity(Math.max(1, Number(e.target.value) || 1))}
                        min="1"
                        className="w-28 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-sm text-blue-700">unit(s) per scanned item</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Scan or Enter Barcode
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (barcodeInput.trim() && watchedProjectId) {
                                handleBarcodeSubmit(e as any);
                              }
                            }
                          }}
                          placeholder="Scan barcode here..."
                          className="w-full pl-10 pr-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus={scanningEnabled}
                          disabled={!watchedProjectId}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!barcodeInput.trim() || !watchedProjectId}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    {!watchedProjectId && (
                      <p className="mt-2 text-xs text-blue-700">
                        ⚠️ Please select a project before scanning items
                      </p>
                    )}
                    <p className="mt-2 text-xs text-blue-700">
                      💡 Scanned items are added to the gate pass. Stock will be updated when the gate pass is created.
                    </p>
                  </div>
                </form>
              </div>
            )}

            {/* Pending Items Section - Manual Entry with Add Buttons */}
            {pendingItems.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Items to Add ({pendingItems.length})
                </h3>
                {pendingItems.map((pendingItem) => {
                  const selectedItem = items.find(i => i.id === pendingItem.itemId);
                  const isChecking = stockChecking[pendingItem.id];
                  
                  return (
                    <div key={pendingItem.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        {/* Item Selection */}
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Item <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={pendingItem.itemId}
                            onChange={(e) => handlePendingItemChange(pendingItem.id, 'itemId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          >
                            <option value="">Select item</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.barcode})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={pendingItem.quantity}
                            onChange={(e) => handlePendingItemChange(pendingItem.id, 'quantity', Number(e.target.value))}
                            min="1"
                            step="1"
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                          {selectedItem && (
                            <p className="mt-1 text-xs text-gray-500">
                              {selectedItem.unitOfMeasurement}
                              {selectedItem.currentQuantity !== undefined && (
                                <span className="ml-2 text-blue-600">
                                  Stock: {selectedItem.currentQuantity}
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Unit Price */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit Price <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={pendingItem.unitPrice}
                            onChange={(e) => handlePendingItemChange(pendingItem.id, 'unitPrice', Number(e.target.value))}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="md:col-span-3 flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddPendingToGatePass(pendingItem)}
                            disabled={isChecking || !pendingItem.itemId}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {isChecking ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Checking...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                Add to Gate Pass
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePendingItem(pendingItem.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Preview Total */}
                      <div className="mt-3 pt-3 border-t border-yellow-300">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Preview Total:</span>
                          <span className="font-semibold text-gray-900">
                            ₹{((pendingItem.quantity || 0) * (pendingItem.unitPrice || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirmed Gate Pass Items */}
            {fields.length > 0 && (
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Gate Pass Items ({fields.length})
              </h3>
            )}

            <div className="space-y-4">
              {fields.map((field, index) => {
                const currentItem = watchedItems[index];
                const isScanned = currentItem?.itemId && scannedItemIds.has(currentItem.itemId);
                const selectedItem = items.find((item) => item.id === currentItem?.itemId);

                return (
                  <div
                    key={field.id}
                    className={`border rounded-lg p-4 ${
                      isScanned ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {isScanned && selectedItem ? (
                      /* Scanned Item - Read-Only Display */
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                              <ScanLine className="w-3 h-3 mr-1" />
                              Scanned
                            </span>
                            <span className="text-sm text-blue-700">
                              Scan barcode again to increase quantity
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setScannedItemIds(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(currentItem.itemId);
                                return newSet;
                              });
                              remove(index);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item
                            </label>
                            <div className="px-3 py-2 bg-white border border-blue-200 rounded-lg">
                              <p className="font-medium text-gray-900">{selectedItem.name}</p>
                              <p className="text-xs text-gray-500">{selectedItem.barcode}</p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <div className="px-3 py-2 bg-white border border-blue-200 rounded-lg">
                              <p className="font-semibold text-gray-900 text-lg">
                                {currentItem.quantity} {selectedItem.unitOfMeasurement}
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Price
                            </label>
                            <div className="px-3 py-2 bg-white border border-blue-200 rounded-lg">
                              <p className="font-semibold text-gray-900 text-lg">
                                ₹{Number(currentItem.unitPrice || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-blue-300">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Line Total:</span>
                            <span className="text-lg font-semibold text-gray-900">
                              ₹
                              {(
                                (currentItem?.quantity || 0) *
                                (currentItem?.unitPrice || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Manual Item - Quantity Editable, Item Locked */
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-white">
                            Manual Entry
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              remove(index);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Item Display - Locked */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item
                            </label>
                            <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg">
                              {selectedItem ? (
                                <>
                                  <p className="font-medium text-gray-900">{selectedItem.name}</p>
                                  <p className="text-xs text-gray-500">{selectedItem.barcode}</p>
                                  {selectedItem.currentQuantity !== undefined && (
                                    <p className="text-xs text-blue-600 mt-1">
                                      Available: {selectedItem.currentQuantity} {selectedItem.unitOfMeasurement}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-gray-500 italic">No item selected</p>
                              )}
                            </div>
                            {errors.items?.[index]?.itemId && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.items[index]?.itemId?.message}
                              </p>
                            )}
                          </div>

                          {/* Quantity - Editable */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                              type="number"
                              min="1"
                              step="1"
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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

                          {/* Unit Price - Display Only */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Price
                            </label>
                            <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg">
                              <p className="font-semibold text-gray-900 text-lg">
                                ₹{Number(currentItem?.unitPrice || 0).toFixed(2)}
                              </p>
                            </div>
                            {errors.items?.[index]?.unitPrice && (
                              <p className="mt-1 text-xs text-red-600">
                                {errors.items[index]?.unitPrice?.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="mt-3 pt-3 border-t border-gray-300">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Line Total:</span>
                            <span className="text-lg font-semibold text-gray-900">
                              ₹
                              {(
                                (currentItem?.quantity || 0) *
                                (currentItem?.unitPrice || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {fields.length === 0 && (
              <div className="text-center py-8 px-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-2">No items added to gate pass yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  {scanningEnabled 
                    ? 'Scan barcodes to add items to this gate pass' 
                    : 'Click "Add Item" to manually add items or enable scanning'}
                </p>
                {pendingItems.length > 0 && (
                  <p className="text-sm text-yellow-700 font-medium">
                    ⚠️ You have {pendingItems.length} pending item(s) above. Click "Add to Gate Pass" on each item.
                  </p>
                )}
              </div>
            )}

            {errors.items && typeof errors.items.message === 'string' && (
              <p className="mt-2 text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded p-3">
                ⚠️ {errors.items.message}
              </p>
            )}

            {/* Total Amount */}
            <div className="mt-6 pt-6 border-t border-gray-300">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Information</h2>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                {...register('notes')}
                id="notes"
                rows={4}
                placeholder="Add any additional notes or terms..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Note</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• A unique gate pass number will be automatically generated</li>
              <li>• The gatepass will be created with "Pending" payment status</li>
              <li>• You can update payment status later from the gatepass list</li>
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
              disabled={isLoading || fields.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={fields.length === 0 ? 'Add at least one item to the gate pass' : ''}
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Creating...' : 'Create GatePass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
