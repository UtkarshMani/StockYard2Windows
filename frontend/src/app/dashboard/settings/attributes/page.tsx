'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, GripVertical, Save, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
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
  category?: {
    id: string;
    name: string;
  };
}

export default function AttributesManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    inputType: 'text',
    required: false,
    options: '',
    validationRules: '',
    helpText: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchAttributes(selectedCategoryId);
    } else {
      setAttributes([]);
    }
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAttributes = async (categoryId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/attributes/category/${categoryId}`);
      setAttributes(response.data || []);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      setError('Failed to fetch attributes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCategoryId) {
      setError('Please select a category');
      return;
    }

    // Validate JSON fields
    if (formData.options) {
      try {
        JSON.parse(formData.options);
      } catch {
        setError('Options must be valid JSON array (e.g., ["Option 1","Option 2"])');
        return;
      }
    }

    if (formData.validationRules) {
      try {
        JSON.parse(formData.validationRules);
      } catch {
        setError('Validation rules must be valid JSON object (e.g., {"min":0,"max":100})');
        return;
      }
    }

    try {
      const data = {
        ...formData,
        categoryId: selectedCategoryId,
        displayOrder: editingAttribute ? editingAttribute.displayOrder : attributes.length,
      };

      if (editingAttribute) {
        await api.put(`/attributes/${editingAttribute.id}`, data);
      } else {
        await api.post('/attributes', data);
      }

      await fetchAttributes(selectedCategoryId);
      resetForm();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save attribute');
    }
  };

  const handleDelete = async (attributeId: string) => {
    if (!confirm('Are you sure? This will delete all associated values for existing items.')) {
      return;
    }

    try {
      await api.delete(`/attributes/${attributeId}`);
      await fetchAttributes(selectedCategoryId);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete attribute');
    }
  };

  const handleEdit = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setFormData({
      name: attribute.name,
      label: attribute.label,
      inputType: attribute.inputType,
      required: attribute.required,
      options: attribute.options || '',
      validationRules: attribute.validationRules || '',
      helpText: attribute.helpText || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      label: '',
      inputType: 'text',
      required: false,
      options: '',
      validationRules: '',
      helpText: '',
    });
    setEditingAttribute(null);
    setShowForm(false);
    setError('');
  };

  const handleReorder = async (attributeIds: string[]) => {
    try {
      await api.post(`/attributes/category/${selectedCategoryId}/reorder`, { attributeIds });
      await fetchAttributes(selectedCategoryId);
    } catch (error) {
      console.error('Error reordering attributes:', error);
    }
  };

  const moveAttribute = (index: number, direction: 'up' | 'down') => {
    const newAttributes = [...attributes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newAttributes.length) return;

    [newAttributes[index], newAttributes[targetIndex]] = [newAttributes[targetIndex], newAttributes[index]];
    
    const attributeIds = newAttributes.map(attr => attr.id);
    handleReorder(attributeIds);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attribute Management</h1>
        <p className="text-gray-600 mt-1">
          Manage category-specific fields for inventory items
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Category Selection & Attributes List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 mr-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => setShowForm(true)}
                disabled={!selectedCategoryId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 mt-6"
              >
                <Plus size={16} />
                Add Attribute
              </button>
            </div>

            {loading && (
              <p className="text-gray-500 text-center py-8">Loading attributes...</p>
            )}

            {!loading && selectedCategoryId && attributes.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No attributes defined for this category yet.
              </p>
            )}

            {!loading && attributes.length > 0 && (
              <div className="space-y-2">
                {attributes.map((attribute, index) => (
                  <div
                    key={attribute.id}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveAttribute(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <GripVertical size={16} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => moveAttribute(index, 'down')}
                        disabled={index === attributes.length - 1}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <GripVertical size={16} className="text-gray-400" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{attribute.label}</h3>
                        {attribute.required && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {attribute.name} • {attribute.inputType}
                      </p>
                      {attribute.helpText && (
                        <p className="text-xs text-gray-400 mt-1">{attribute.helpText}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(attribute)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(attribute.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Add/Edit Form */}
        {showForm && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingAttribute ? 'Edit Attribute' : 'New Attribute'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., voltage, power_rating"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lowercase, no spaces (use underscores)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Operating Voltage"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Input Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.inputType}
                    onChange={(e) => setFormData({ ...formData, inputType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Text Area</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="url">URL</option>
                    <option value="date">Date</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="file">File</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="required"
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                    Required field
                  </label>
                </div>

                {(formData.inputType === 'dropdown' || formData.inputType === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options (JSON Array)
                    </label>
                    <textarea
                      value={formData.options}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                      placeholder='["Option 1","Option 2","Option 3"]'
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Validation Rules (JSON)
                  </label>
                  <textarea
                    value={formData.validationRules}
                    onChange={(e) => setFormData({ ...formData, validationRules: e.target.value })}
                    placeholder='{"min":0,"max":100}'
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Help Text
                  </label>
                  <input
                    type="text"
                    value={formData.helpText}
                    onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
                    placeholder="Optional description for users"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    {editingAttribute ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
