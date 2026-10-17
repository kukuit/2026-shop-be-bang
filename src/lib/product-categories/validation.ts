import { z } from 'zod'

const categoryImage = z.string().trim().max(2048).refine(value => value === '' || value.startsWith('/') || /^https?:\/\//i.test(value), 'Ảnh cần là đường dẫn nội bộ hoặc URL http(s).').nullable().optional()
const categoryFields = {
  name: z.string().trim().min(1, 'Tên danh mục không được để trống.').max(100),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'),
  description: z.string().trim().max(2000).optional().default(''),
  imageUrl: categoryImage,
  imageStoragePath: z.string().max(500).regex(/^product-categories\/[a-zA-Z0-9_-]{1,180}\/[a-zA-Z0-9_-]{1,100}\.(?:jpg|png|webp)$/).nullable().optional(),
  parentId: z.string().trim().max(180).regex(/^[a-zA-Z0-9_-]+$/).nullable(),
  sortOrder: z.number().int().min(0).max(100000),
  isActive: z.boolean(),
}

export const createProductCategorySchema = z.object({ ...categoryFields, id: z.string().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/).optional() }).strict()
export const updateProductCategorySchema = z.object(categoryFields).partial().strict()
