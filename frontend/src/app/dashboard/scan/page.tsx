'use client';

import { useState, useRef, useEffect } from 'react';
import { BarcodeScanner } from '@/components/barcode-scanner';
import BackButton from '@/components/back-button';
import { Camera, Search, ScanLine, PackagePlus, PackageMinus, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type ScanMode = 'in' | 'out';

interface Item {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId?: string;
  currentQuantity: number;
  unitOfMeasurement: string;
  category?: {
    id: string;
    name: string;
  };
}

export default function ScanPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('in');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Unknown barcode modal
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [scannedUnknownBarcode, setScannedUnknownBarcode] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    unitOfMeasurement: 'pcs',
    initialQuantity: 0,
  });

  // Auto-focus on barcode input when page loads
  useEffect(() => {
    barcodeInputRef.current?.focus();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleScan = async (barcode: string) => {
    setShowScanner(false);
    setIsLoading(true);
    let itemNotFound = false;

    try {
      // Try to find the item by barcode
      const itemResponse = await api.get(`/items/barcode/${barcode}`);
      const item: Item = itemResponse.data.data.item;

      // Process stock movement based on scan mode
      if (scanMode === 'in') {
        await api.post('/stock/in', {
          itemId: item.id,
          quantity,
          notes: 'Scanned stock in',
        });
        toast.success(`✓ Stock In: ${item.name} (+${quantity} ${item.unitOfMeasurement})`);
      } else {
        // Check if enough stock available
        if (item.currentQuantity < quantity) {
          toast.error(`Insufficient stock! Available: ${item.currentQuantity} ${item.unitOfMeasurement}`);
          setIsLoading(false);
          setBarcodeInput('');
          barcodeInputRef.current?.focus();
          return;
        }
        
        await api.post('/stock/out', {
          itemId: item.id,
          quantity,
          notes: 'Scanned stock out',
        });
        toast.success(`✓ Stock Out: ${item.name} (-${quantity} ${item.unitOfMeasurement})`);
      }

      // Add to recent scans
      setRecentScans(prev => [{
        ...item,
        scannedQuantity: quantity,
        scannedMode: scanMode,
        scannedAt: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)]);

      // Reset quantity to default
      setQuantity(1);
    } catch (error: any) {
      // Handle unknown barcode (404 error)
      if (error.response?.status === 404) {
        itemNotFound = true;
        setScannedUnknownBarcode(barcode);
        setShowNewItemModal(true);
        toast.error(`Unknown barcode: ${barcode}`);
      } else {
        const message = error.response?.data?.message || 'Failed to process item';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
      setBarcodeInput('');
      // Don't re-focus input after item-not-found to prevent
      // the physical scanner's next scan from triggering actions
      if (!itemNotFound) {
        barcodeInputRef.current?.focus();
      } else {
        // Blur the input so scanner buffer is ignored
        barcodeInputRef.current?.blur();
      }
    }
  };

  const handleCreateNewItem = () => {
    // Require name to be filled
    if (!newItemForm.name.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const createItem = async () => {
      try {
        const response = await api.post('/items', {
          barcode: scannedUnknownBarcode,
          name: newItemForm.name,
          description: newItemForm.description || undefined,
          categoryId: newItemForm.categoryId || undefined,
          unitOfMeasurement: newItemForm.unitOfMeasurement,
          currentQuantity: newItemForm.initialQuantity,
          minStockLevel: 0,
        });

        const newItem = response.data.data.item;
        toast.success(`New item created: ${newItem.name}`);

        // Close modal and reset
        setShowNewItemModal(false);
        setScannedUnknownBarcode('');
        setNewItemForm({
          name: '',
          categoryId: '',
          description: '',
          unitOfMeasurement: 'pcs',
          initialQuantity: 0,
        });

        // Add to recent scans
        setRecentScans(prev => [{
          ...newItem,
          scannedQuantity: newItemForm.initialQuantity,
          scannedMode: 'new',
          scannedAt: new Date().toLocaleTimeString(),
        }, ...prev.slice(0, 9)]);

        // Re-focus barcode input for next scan
        barcodeInputRef.current?.focus();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to create item');
      }
    };

    createItem();
  };

  const closeNewItemModal = () => {
    setShowNewItemModal(false);
    setScannedUnknownBarcode('');
    setNewItemForm({
      name: '',
      categoryId: '',
      description: '',
      unitOfMeasurement: 'pcs',
      initialQuantity: 0,
    });
    barcodeInputRef.current?.focus();
  };

  // Block Enter key inside the new-item modal to prevent scanner auto-submit
  const blockEnterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Handle barcode input from physical scanner
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value);
  };

  // Handle Enter key or manual search
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim() && !isLoading) {
      handleScan(barcodeInput.trim());
    }
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
                <h1 className="text-3xl font-bold text-gray-900">
                  Scan {scanMode === 'in' ? 'In' : 'Out'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {scanMode === 'in' 
                    ? 'Scan barcodes to add items to inventory'
                    : 'Scan barcodes to remove items from inventory'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Scan Mode Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Scan Mode
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setScanMode('in')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                scanMode === 'in'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PackagePlus className="w-5 h-5" />
              Stock In
            </button>
            <button
              onClick={() => setScanMode('out')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                scanMode === 'out'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PackageMinus className="w-5 h-5" />
              Stock Out
            </button>
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Quantity per Scan
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              min="1"
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">unit(s) will be added for each scanned item</span>
          </div>
        </div>

        {/* Barcode Input (for physical scanner or manual entry) */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <form onSubmit={handleBarcodeSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Scan or Enter Barcode
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={handleBarcodeInputChange}
                  placeholder="Focus here and scan with your device..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!barcodeInput.trim() || isLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Search className="h-5 w-5" />
                Search
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Tip: Keep this field focused. Your barcode scanner will automatically type here.
            </p>
          </form>
        </div>

        {/* Camera Scanner Button (Alternative) */}
        <button
          onClick={() => setShowScanner(true)}
          className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 mb-6"
        >
          <Camera className="h-5 w-5" />
          <span>Or Use Camera Scanner</span>
        </button>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Scans
            </h2>
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{scan.name}</p>
                    <p className="text-sm text-gray-600">Barcode: {scan.barcode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{scan.scannedQuantity} {scan.unitOfMeasurement}</p>
                    <p className="text-xs text-gray-500">{scan.scannedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Set the quantity you want to add per scan (default: 1)</li>
            <li>• Scan a barcode or enter it manually</li>
            <li>• Stock is updated immediately - no confirmation needed</li>
            <li>• Continue scanning for fast, continuous stock-in</li>
            <li>• For stock-out to projects, use the gate pass section instead</li>
          </ul>
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* New Item Modal — Enter key is blocked so physical scanner cannot auto-submit */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6" onKeyDown={blockEnterKey}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Unknown Barcode</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Barcode <span className="font-mono font-semibold">{scannedUnknownBarcode}</span> not found in database
                </p>
              </div>
              <button
                onClick={closeNewItemModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>What to do?</strong><br />
                  This barcode is not in the system. You can:
                </p>
                <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>Create a new item with this barcode below</li>
                  <li>Or cancel and check if the barcode was scanned correctly</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2.5mm Copper Wire"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newItemForm.categoryId}
                    onChange={(e) => setNewItemForm({ ...newItemForm, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit of Measurement *
                  </label>
                  <select
                    value={newItemForm.unitOfMeasurement}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unitOfMeasurement: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="m">Meters</option>
                    <option value="l">Liters</option>
                    <option value="box">Box</option>
                    <option value="roll">Roll</option>
                    <option value="bag">Bag</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemForm.initialQuantity}
                    onChange={(e) => setNewItemForm({ ...newItemForm, initialQuantity: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeNewItemModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewItem}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
