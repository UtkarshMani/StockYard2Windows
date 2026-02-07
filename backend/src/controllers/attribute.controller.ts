import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import logger from '../utils/logger';

// Validation schemas
const createAttributeSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  inputType: z.enum(['text', 'number', 'dropdown', 'checkbox', 'file', 'date', 'email', 'url', 'textarea', '2-box-dimensions', '3-box-dimensions']),
  required: z.boolean().default(false),
  options: z.string().optional(), // JSON string
  validationRules: z.string().optional(), // JSON string
  helpText: z.string().optional(),
  displayOrder: z.number().int().default(0),
  conditionalAppearance: z.string().optional(), // JSON string
});

const updateAttributeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(200).optional(),
  inputType: z.enum(['text', 'number', 'dropdown', 'checkbox', 'file', 'date', 'email', 'url', 'textarea', '2-box-dimensions', '3-box-dimensions']).optional(),
  required: z.boolean().optional(),
  options: z.string().optional(),
  validationRules: z.string().optional(),
  helpText: z.string().optional(),
  displayOrder: z.number().int().optional(),
  conditionalAppearance: z.string().optional(), // JSON string
});

export const getAttributesByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    // Validate categoryId is a valid UUID
    if (!z.string().uuid().safeParse(categoryId).success) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const attributes = await prisma.attribute.findMany({
      where: { categoryId },
      orderBy: { displayOrder: 'asc' },
    });

    return res.json(attributes);
  } catch (error) {
    logger.error('Error fetching attributes:', error);
    return res.status(500).json({ error: 'Failed to fetch attributes' });
  }
};

export const getAllAttributes = async (req: Request, res: Response) => {
  try {
    const attributes = await prisma.attribute.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { categoryId: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    return res.json(attributes);
  } catch (error) {
    logger.error('Error fetching all attributes:', error);
    return res.status(500).json({ error: 'Failed to fetch attributes' });
  }
};

export const getAttributeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid attribute ID' });
    }

    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!attribute) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    return res.json(attribute);
  } catch (error) {
    logger.error('Error fetching attribute:', error);
    return res.status(500).json({ error: 'Failed to fetch attribute' });
  }
};

export const createAttribute = async (req: Request, res: Response) => {
  try {
    const validatedData = createAttributeSchema.parse(req.body);

    // Validate JSON strings if provided
    if (validatedData.options) {
      try {
        JSON.parse(validatedData.options);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format for options' });
      }
    }

    if (validatedData.validationRules) {
      try {
        JSON.parse(validatedData.validationRules);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format for validation rules' });
      }
    }

    if (validatedData.conditionalAppearance) {
      try {
        JSON.parse(validatedData.conditionalAppearance);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format for conditional appearance' });
      }
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check for duplicate attribute name in the same category
    const existingAttribute = await prisma.attribute.findFirst({
      where: {
        categoryId: validatedData.categoryId,
        name: validatedData.name,
      },
    });

    if (existingAttribute) {
      return res.status(409).json({ error: 'Attribute with this name already exists in this category' });
    }

    const attribute = await prisma.attribute.create({
      data: {
        name: validatedData.name,
        label: validatedData.label,
        inputType: validatedData.inputType,
        required: validatedData.required,
        options: validatedData.options,
        validationRules: validatedData.validationRules,
        helpText: validatedData.helpText,
        displayOrder: validatedData.displayOrder,
        conditionalAppearance: validatedData.conditionalAppearance,
        category: {
          connect: { id: validatedData.categoryId },
        },
      },
    });

    logger.info(`Attribute created: ${attribute.id} for category ${validatedData.categoryId}`);
    return res.status(201).json(attribute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Error creating attribute:', error);
    return res.status(500).json({ error: 'Failed to create attribute' });
  }
};

export const updateAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid attribute ID' });
    }

    const validatedData = updateAttributeSchema.parse(req.body);

    // Validate JSON strings if provided
    if (validatedData.options) {
      try {
        JSON.parse(validatedData.options);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format for options' });
      }
    }

    if (validatedData.validationRules) {
      try {
        JSON.parse(validatedData.validationRules);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format for validation rules' });
      }
    }

    if (validatedData.conditionalAppearance) {
      try {
        JSON.parse(validatedData.conditionalAppearance);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON format for conditional appearance' });
      }
    }

    // Check if attribute exists
    const existingAttribute = await prisma.attribute.findUnique({
      where: { id },
    });

    if (!existingAttribute) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    // If name is being updated, check for duplicates
    if (validatedData.name && validatedData.name !== existingAttribute.name) {
      const duplicateAttribute = await prisma.attribute.findFirst({
        where: {
          categoryId: existingAttribute.categoryId,
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (duplicateAttribute) {
        return res.status(409).json({ error: 'Attribute with this name already exists in this category' });
      }
    }

    const attribute = await prisma.attribute.update({
      where: { id },
      data: validatedData,
    });

    logger.info(`Attribute updated: ${id}`);
    return res.json(attribute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Error updating attribute:', error);
    return res.status(500).json({ error: 'Failed to update attribute' });
  }
};

export const deleteAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({ error: 'Invalid attribute ID' });
    }

    // Check if attribute exists
    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    if (!attribute) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    // Warn if attribute has values
    if (attribute._count.values > 0) {
      logger.warn(`Deleting attribute ${id} with ${attribute._count.values} associated values`);
    }

    await prisma.attribute.delete({
      where: { id },
    });

    logger.info(`Attribute deleted: ${id}`);
    return res.json({ message: 'Attribute deleted successfully' });
  } catch (error) {
    logger.error('Error deleting attribute:', error);
    return res.status(500).json({ error: 'Failed to delete attribute' });
  }
};

export const reorderAttributes = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { attributeIds } = req.body; // Array of attribute IDs in new order

    if (!z.string().uuid().safeParse(categoryId).success) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    if (!Array.isArray(attributeIds) || attributeIds.length === 0) {
      return res.status(400).json({ error: 'attributeIds must be a non-empty array' });
    }

    // Verify all attributes belong to the category
    const attributes = await prisma.attribute.findMany({
      where: {
        id: { in: attributeIds },
        categoryId,
      },
    });

    if (attributes.length !== attributeIds.length) {
      return res.status(400).json({ error: 'Some attribute IDs are invalid or do not belong to this category' });
    }

    // Update display order in a transaction
    await prisma.$transaction(
      attributeIds.map((id, index) =>
        prisma.attribute.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );

    logger.info(`Attributes reordered for category ${categoryId}`);
    return res.json({ message: 'Attributes reordered successfully' });
  } catch (error) {
    logger.error('Error reordering attributes:', error);
    return res.status(500).json({ error: 'Failed to reorder attributes' });
  }
};
