'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/back-button';
import {
  Folder,
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  X,
  Settings,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count?: {
    items: number;
  };
}

interface Attribute {
  id: string;
  categoryId: string;
  name: string;
  label: string;
  inputType: string;
  required: boolean;
  options?: string;
  validationRules?: string;
  helpText?: string;
  displayOrder: number;
  conditionalAppearance?: string;
}

interface AttributeFormData {
  name: string;
  label: string;
  inputType: string;
  required: boolean;
  options: string;
  helpText: string;
  hasConditional: boolean;
  conditionalDependsOn: string;
  conditionalValues: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [attributeFormData, setAttributeFormData] = useState<AttributeFormData>({
    name: '',
    label: '',
    inputType: 'text',
    required: false,
    options: '',
    helpText: '',
    hasConditional: false,
    conditionalDependsOn: '',
    conditionalValues: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      const categoriesData = response.data.data.categories || [];
      
      // Remove duplicates based on ID
      const uniqueCategories = categoriesData.filter((category: any, index: number, self: any[]) =>
        index === self.findIndex((c: any) => c.id === category.id)
      );
      
      setCategories(uniqueCategories);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({ name: '', description: '' });
    setShowAddModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowEditModal(true);
    fetchCategoryAttributes(category.id);
  };

  const fetchCategoryAttributes = async (categoryId: string) => {
    try {
      const response = await api.get(`/attributes/category/${categoryId}`);
      setAttributes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch attributes:', error);
      setAttributes([]);
    }
  };

  const handleAddAttribute = () => {
    setAttributeFormData({
      name: '',
      label: '',
      inputType: 'text',
      required: false,
      options: '',
      helpText: '',
      hasConditional: false,
      conditionalDependsOn: '',
      conditionalValues: '',
    });
    setEditingAttribute(null);
    setShowAttributeForm(true);
  };

  const handleEditAttribute = (attribute: Attribute) => {
    let conditionalData = { hasConditional: false, dependsOn: '', values: '' };
    if (attribute.conditionalAppearance) {
      try {
        const parsed = JSON.parse(attribute.conditionalAppearance);
        conditionalData = {
          hasConditional: true,
          dependsOn: parsed.dependsOn || '',
          values: parsed.showForValues ? parsed.showForValues.join(', ') : '',
        };
      } catch (e) {
        console.error('Failed to parse conditional appearance:', e);
      }
    }
    
    setAttributeFormData({
      name: attribute.name,
      label: attribute.label,
      inputType: attribute.inputType,
      required: attribute.required,
      options: attribute.options || '',
      helpText: attribute.helpText || '',
      hasConditional: conditionalData.hasConditional,
      conditionalDependsOn: conditionalData.dependsOn,
      conditionalValues: conditionalData.values,
    });
    setEditingAttribute(attribute);
    setShowAttributeForm(true);
  };

  const handleSubmitAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      let conditionalAppearance = undefined;
      if (attributeFormData.hasConditional && attributeFormData.conditionalDependsOn && attributeFormData.conditionalValues) {
        const values = attributeFormData.conditionalValues.split(',').map(v => v.trim()).filter(v => v);
        conditionalAppearance = JSON.stringify({
          dependsOn: attributeFormData.conditionalDependsOn,
          showForValues: values,
        });
      }
      
      const payload = {
        name: attributeFormData.name,
        label: attributeFormData.label,
        inputType: attributeFormData.inputType,
        required: attributeFormData.required,
        categoryId: editingCategory.id,
        displayOrder: editingAttribute?.displayOrder || attributes.length,
        options: attributeFormData.options ? attributeFormData.options : undefined,
        helpText: attributeFormData.helpText || undefined,
        conditionalAppearance,
      };

      if (editingAttribute) {
        await api.put(`/attributes/${editingAttribute.id}`, payload);
        toast.success('Attribute updated successfully');
      } else {
        await api.post('/attributes', payload);
        toast.success('Attribute added successfully');
      }

      fetchCategoryAttributes(editingCategory.id);
      setShowAttributeForm(false);
      setEditingAttribute(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save attribute');
    }
  };

  const handleDeleteAttribute = async (attributeId: string) => {
    if (!confirm('Are you sure you want to delete this attribute?')) return;

    try {
      await api.delete(`/attributes/${attributeId}`);
      toast.success('Attribute deleted successfully');
      if (editingCategory) {
        fetchCategoryAttributes(editingCategory.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete attribute');
    }
  };

  const handleMoveAttribute = async (attributeId: string, direction: 'up' | 'down') => {
    if (!editingCategory) return;
    
    const index = attributes.findIndex(a => a.id === attributeId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === attributes.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newAttributes = [...attributes];
    [newAttributes[index], newAttributes[newIndex]] = [newAttributes[newIndex], newAttributes[index]];

    try {
      // Send the new order of all attribute IDs
      const attributeIds = newAttributes.map(a => a.id);
      await api.post(`/attributes/category/${editingCategory.id}/reorder`, {
        attributeIds,
      });
      
      // Update local state with new order
      setAttributes(newAttributes.map((attr, idx) => ({
        ...attr,
        displayOrder: idx,
      })));
      
      toast.success('Fields reordered successfully');
    } catch (error: any) {
      toast.error('Failed to reorder attributes');
      console.error('Reorder error:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will affect all items in this category.`)) return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/categories', formData);
      toast.success('Category created successfully');
      setShowAddModal(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      await api.put(`/categories/${editingCategory.id}`, formData);
      toast.success('Category updated successfully');
      setShowEditModal(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-4">
            <BackButton fallbackRoute="/dashboard" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Folder className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                  <p className="text-sm text-gray-600">Manage item categories</p>
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
                <span>Add Category</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No categories found' : 'No categories yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Get started by creating your first category'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
                <span>Add First Category</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Folder className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-500">
                        {category._count?.items || 0} items
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600">{category.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Category</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Electrical"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of the category"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Category</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCategory(null);
                    setAttributes([]);
                    setShowAttributeForm(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Category Basic Info */}
              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Electrical"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the category"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Category Info
                </button>
              </form>

              {/* Category-Specific Fields Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Category-Specific Fields</h3>
                  </div>
                  <button
                    onClick={handleAddAttribute}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </button>
                </div>

                {attributes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No custom fields defined for this category. Add fields to capture category-specific information.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {attributes.map((attr, index) => (
                      <div
                        key={attr.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{attr.label}</h4>
                              {attr.required && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                  Required
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                {attr.inputType}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">Field Name: {attr.name}</p>
                            {attr.helpText && (
                              <p className="text-sm text-gray-500 mt-1">{attr.helpText}</p>
                            )}
                            {attr.options && (
                              <p className="text-sm text-gray-500 mt-1">
                                Options: {JSON.parse(attr.options).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveAttribute(attr.id, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleMoveAttribute(attr.id, 'down')}
                              disabled={index === attributes.length - 1}
                              className="p-1 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditAttribute(attr)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAttribute(attr.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit Attribute Form */}
                {showAttributeForm && (
                  <div className="mt-4 border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      {editingAttribute ? 'Edit Field' : 'Add New Field'}
                    </h4>
                    <form onSubmit={handleSubmitAttribute} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Field Name * <span className="text-xs text-gray-500">(lowercase, no spaces)</span>
                          </label>
                          <input
                            type="text"
                            required
                            pattern="[a-z_]+"
                            value={attributeFormData.name}
                            onChange={(e) => setAttributeFormData({ ...attributeFormData, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="voltage"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Label *
                          </label>
                          <input
                            type="text"
                            required
                            value={attributeFormData.label}
                            onChange={(e) => setAttributeFormData({ ...attributeFormData, label: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Voltage (V)"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Input Type *
                          </label>
                          <select
                            value={attributeFormData.inputType}
                            onChange={(e) => setAttributeFormData({ ...attributeFormData, inputType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="date">Date</option>
                            <option value="email">Email</option>
                            <option value="url">URL</option>
                            <option value="textarea">Textarea</option>
                            <option value="file">File</option>
                            <option value="2-box-dimensions">2 Box Dimensions (L × W)</option>
                            <option value="3-box-dimensions">3 Box Dimensions (L × W × H)</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={attributeFormData.required}
                              onChange={(e) => setAttributeFormData({ ...attributeFormData, required: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Required Field</span>
                          </label>
                        </div>
                      </div>

                      {(attributeFormData.inputType === 'dropdown' || attributeFormData.inputType === 'checkbox') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options <span className="text-xs text-gray-500">(comma-separated)</span>
                          </label>
                          <input
                            type="text"
                            value={attributeFormData.options}
                            onChange={(e) => setAttributeFormData({ ...attributeFormData, options: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Help Text
                        </label>
                        <input
                          type="text"
                          value={attributeFormData.helpText}
                          onChange={(e) => setAttributeFormData({ ...attributeFormData, helpText: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Additional information for users"
                        />
                      </div>

                      {/* Conditional Appearance */}
                      <div className="border-t border-gray-200 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={attributeFormData.hasConditional}
                            onChange={(e) => setAttributeFormData({ 
                              ...attributeFormData, 
                              hasConditional: e.target.checked,
                              conditionalDependsOn: e.target.checked ? attributeFormData.conditionalDependsOn : '',
                              conditionalValues: e.target.checked ? attributeFormData.conditionalValues : '',
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Conditional Appearance</span>
                        </label>
                        
                        {attributeFormData.hasConditional && (
                          <div className="space-y-3 ml-6 bg-gray-50 p-3 rounded-lg">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Show this field only when:
                              </label>
                              <select
                                value={attributeFormData.conditionalDependsOn}
                                onChange={(e) => {
                                  setAttributeFormData({ 
                                    ...attributeFormData, 
                                    conditionalDependsOn: e.target.value,
                                    conditionalValues: '' // Reset values when field changes
                                  });
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select field...</option>
                                {attributes
                                  .filter(attr => attr.inputType === 'dropdown' && attr.name !== attributeFormData.name)
                                  .map(attr => (
                                    <option key={attr.id} value={attr.name}>{attr.label}</option>
                                  ))}
                              </select>
                            </div>
                            {attributeFormData.conditionalDependsOn && (() => {
                              const dependencyAttr = attributes.find(a => a.name === attributeFormData.conditionalDependsOn);
                              if (!dependencyAttr?.options) return null;
                              
                              const options = JSON.parse(dependencyAttr.options);
                              const selectedValues = attributeFormData.conditionalValues 
                                ? attributeFormData.conditionalValues.split(',').map(v => v.trim())
                                : [];
                              
                              return (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Has one of these values:
                                  </label>
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {options.map((option: string) => (
                                      <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                                        <input
                                          type="checkbox"
                                          checked={selectedValues.includes(option)}
                                          onChange={(e) => {
                                            const newSelected = e.target.checked
                                              ? [...selectedValues, option]
                                              : selectedValues.filter(v => v !== option);
                                            setAttributeFormData({
                                              ...attributeFormData,
                                              conditionalValues: newSelected.join(', ')
                                            });
                                          }}
                                          className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{option}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttributeForm(false);
                            setEditingAttribute(null);
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          {editingAttribute ? 'Update Field' : 'Add Field'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
