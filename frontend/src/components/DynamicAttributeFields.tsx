'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Attribute {
  id: string;
  name: string;
  label: string;
  inputType: 'text' | 'number' | 'dropdown' | 'checkbox' | 'file' | 'date' | 'email' | 'url' | 'textarea' | '2-box-dimensions' | '3-box-dimensions';
  required: boolean;
  options?: string;
  validationRules?: string;
  helpText?: string;
  displayOrder: number;
  conditionalAppearance?: string;
}

interface AttributeValue {
  attributeId: string;
  value: string;
}

interface DynamicAttributeFieldsProps {
  categoryId: string | null;
  values: AttributeValue[];
  onChange: (values: AttributeValue[]) => void;
  errors?: Record<string, string>;
}

export default function DynamicAttributeFields({
  categoryId,
  values,
  onChange,
  errors = {},
}: DynamicAttributeFieldsProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoryId) {
      fetchAttributes(categoryId);
    } else {
      setAttributes([]);
    }
  }, [categoryId]);

  const fetchAttributes = async (catId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/attributes/category/${catId}`);
      setAttributes(response.data);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (attributeId: string, value: string) => {
    const newValues = [...values];
    const existingIndex = newValues.findIndex((v) => v.attributeId === attributeId);

    if (existingIndex >= 0) {
      newValues[existingIndex] = { attributeId, value };
    } else {
      newValues.push({ attributeId, value });
    }

    // Check if this is a field that other fields depend on
    const changedAttribute = attributes.find(a => a.id === attributeId);
    if (changedAttribute) {
      // Clear values of dependent fields
      const dependentAttributes = attributes.filter(attr => {
        if (!attr.conditionalAppearance) return false;
        try {
          const conditional = JSON.parse(attr.conditionalAppearance);
          return conditional.dependsOn === changedAttribute.name;
        } catch {
          return false;
        }
      });

      // Remove values for fields that depend on the changed field
      dependentAttributes.forEach(depAttr => {
        const depIndex = newValues.findIndex(v => v.attributeId === depAttr.id);
        if (depIndex >= 0) {
          newValues.splice(depIndex, 1);
        }
      });
    }

    onChange(newValues);
  };

  const getValue = (attributeId: string): string => {
    return values.find((v) => v.attributeId === attributeId)?.value || '';
  };

  const parseOptions = (optionsJson?: string): string[] => {
    if (!optionsJson) return [];
    try {
      return JSON.parse(optionsJson);
    } catch {
      return [];
    }
  };

  const parseValidationRules = (rulesJson?: string): any => {
    if (!rulesJson) return {};
    try {
      return JSON.parse(rulesJson);
    } catch {
      return {};
    }
  };

  const renderField = (attribute: Attribute) => {
    const value = getValue(attribute.id);
    const error = errors[attribute.id];
    const rules = parseValidationRules(attribute.validationRules);

    const commonProps = {
      id: attribute.id,
      name: attribute.name,
      required: attribute.required,
      className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`,
    };

    switch (attribute.inputType) {
      case 'text':
        return (
          <input
            {...commonProps}
            type="text"
            value={value}
            onChange={(e) => handleValueChange(attribute.id, e.target.value)}
            maxLength={rules.maxLength}
            minLength={rules.minLength}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            value={value}
            onChange={(e) => handleValueChange(attribute.id, e.target.value)}
            rows={rules.rows || 3}
            maxLength={rules.maxLength}
            minLength={rules.minLength}
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            value={value}
            onChange={(e) => handleValueChange(attribute.id, e.target.value)}
            min={rules.min}
            max={rules.max}
            step={rules.step || 'any'}
          />
        );

      case 'email':
        return (
          <input
            {...commonProps}
            type="email"
            value={value}
            onChange={(e) => handleValueChange(attribute.id, e.target.value)}
          />
        );

      case 'url':
        return (
          <input
            {...commonProps}
            type="url"
            value={value}
            onChange={(e) => handleValueChange(attribute.id, e.target.value)}
            placeholder="https://example.com"
          />
        );

      case 'date':
        return (
          <input
            {...commonProps}
            type="date"
            value={value}
            onChange={(e) => handleValueChange(attribute.id, e.target.value)}
            min={rules.min}
            max={rules.max}
          />
        );

      case 'dropdown':
        const dropdownOptions = parseOptions(attribute.options);
        return (
          <select
            {...commonProps}
            value={value}
            onChange={(e) => handleValueChange(attribute.id, e.target.value)}
          >
            <option value="">-- Select --</option>
            {dropdownOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        const checkboxOptions = parseOptions(attribute.options);
        const selectedValues = value ? value.split(',') : [];
        
        return (
          <div className="space-y-2">
            {checkboxOptions.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newSelected = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    handleValueChange(attribute.id, newSelected.join(','));
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'file':
        return (
          <div>
            <input
              {...commonProps}
              type="text"
              value={value}
              onChange={(e) => handleValueChange(attribute.id, e.target.value)}
              placeholder="Enter file URL or path"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the URL or path to the file
            </p>
          </div>
        );

      case '2-box-dimensions':
        const dims2 = value ? value.split('×').map(v => v.trim()) : ['', ''];
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Length</label>
              <input
                type="number"
                value={dims2[0] || ''}
                onChange={(e) => {
                  const newDims = [e.target.value, dims2[1] || ''];
                  handleValueChange(attribute.id, newDims.join(' × '));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="L"
                step="any"
                required={attribute.required}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width</label>
              <input
                type="number"
                value={dims2[1] || ''}
                onChange={(e) => {
                  const newDims = [dims2[0] || '', e.target.value];
                  handleValueChange(attribute.id, newDims.join(' × '));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="W"
                step="any"
                required={attribute.required}
              />
            </div>
          </div>
        );

      case '3-box-dimensions':
        const dims3 = value ? value.split('×').map(v => v.trim()) : ['', '', ''];
        return (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Length</label>
              <input
                type="number"
                value={dims3[0] || ''}
                onChange={(e) => {
                  const newDims = [e.target.value, dims3[1] || '', dims3[2] || ''];
                  handleValueChange(attribute.id, newDims.join(' × '));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="L"
                step="any"
                required={attribute.required}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width</label>
              <input
                type="number"
                value={dims3[1] || ''}
                onChange={(e) => {
                  const newDims = [dims3[0] || '', e.target.value, dims3[2] || ''];
                  handleValueChange(attribute.id, newDims.join(' × '));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="W"
                step="any"
                required={attribute.required}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Height</label>
              <input
                type="number"
                value={dims3[2] || ''}
                onChange={(e) => {
                  const newDims = [dims3[0] || '', dims3[1] || '', e.target.value];
                  handleValueChange(attribute.id, newDims.join(' × '));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="H"
                step="any"
                required={attribute.required}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!categoryId) {
    return null;
  }

  if (loading) {
    return (
      <div className="py-4">
        <p className="text-sm text-gray-500">Loading category attributes...</p>
      </div>
    );
  }

  if (attributes.length === 0) {
    return null;
  }

  // Generic conditional appearance filter
  const shouldShowField = (attribute: Attribute) => {
    // If no conditional appearance is set, always show the field
    if (!attribute.conditionalAppearance) {
      return true;
    }

    try {
      const conditional = JSON.parse(attribute.conditionalAppearance);
      const { dependsOn, showForValues } = conditional;

      if (!dependsOn || !showForValues || !Array.isArray(showForValues)) {
        return true; // Invalid configuration, show field
      }

      // Find the dependency attribute
      const dependencyAttr = attributes.find(a => a.name === dependsOn);
      if (!dependencyAttr) {
        return true; // Dependency not found, show field
      }

      // Get the current value of the dependency field
      const dependencyValue = getValue(dependencyAttr.id);
      if (!dependencyValue) {
        return false; // No value selected in dependency field, hide this field
      }

      // Show field only if the dependency value is in the showForValues array
      return showForValues.includes(dependencyValue);
    } catch (error) {
      console.error('Error parsing conditional appearance:', error);
      return true; // On error, show the field
    }
  };

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <h3 className="text-lg font-semibold text-gray-900">Category-Specific Fields</h3>
      
      {attributes
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .filter(shouldShowField)
        .map((attribute) => (
          <div key={attribute.id}>
            <label htmlFor={attribute.id} className="block text-sm font-medium text-gray-700 mb-1">
              {attribute.label}
              {attribute.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {renderField(attribute)}
            
            {attribute.helpText && (
              <p className="mt-1 text-xs text-gray-500">{attribute.helpText}</p>
            )}
            
            {errors[attribute.id] && (
              <p className="mt-1 text-xs text-red-500">{errors[attribute.id]}</p>
            )}
          </div>
        ))}
    </div>
  );
}
