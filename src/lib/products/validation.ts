import { z } from 'zod'
import { MAX_PRODUCT_IMAGE_COUNT } from './image-validation'

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => value ?? '')
const imageUrl = z.string().trim().max(2048).refine(value => value.startsWith('/') || /^https?:\/\//i.test(value), 'Ảnh cần là đường dẫn nội bộ hoặc URL http(s).')
const nullableDate = z.string().datetime({ offset: true }).nullable().optional().transform(value => value ?? null)

export const productImageSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  url: imageUrl,
  storagePath: z.string().max(500).regex(/^products\/[a-zA-Z0-9_-]{1,180}\/[a-zA-Z0-9_-]{1,100}\.(?:jpg|png|webp)$/).optional(),
  publicId: z.string().max(255).regex(/^shopbebang\/products\/[a-zA-Z0-9_-]{1,180}\/(?:[a-f0-9-]{36}|image-[a-f0-9-]{36})$/i).optional(),
  width: z.number().int().min(1).max(20000).optional(),
  height: z.number().int().min(1).max(20000).optional(),
  format: z.enum(['jpg', 'jpeg', 'png', 'webp']).optional(),
  alt: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(1000),
}).strict()

const productFields = {
  name: z.string().trim().min(1, 'Tên sản phẩm không được để trống.').max(160),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang.'),
  description: nullableText(10000),
  shortDescription: nullableText(500),
  categoryId: z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/),
  thumbnail: imageUrl.or(z.literal('')),
  images: z.array(productImageSchema).max(MAX_PRODUCT_IMAGE_COUNT),
  price: z.number().int().min(1).max(1_000_000_000),
  salePrice: z.number().int().positive().max(1_000_000_000).nullable(),
  saleStartAt: nullableDate,
  saleEndAt: nullableDate,
  isNewArrival: z.boolean(),
  arrivalAt: nullableDate,
  stock: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1_000_000),
}

function validateSale(data: { price?: number; salePrice?: number | null; saleStartAt?: string | null; saleEndAt?: string | null }, context: z.RefinementCtx) {
  if (data.price !== undefined && data.salePrice !== undefined && data.salePrice !== null && data.salePrice >= data.price)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['salePrice'], message: 'Giá sale phải thấp hơn giá gốc.' })
  if (data.saleStartAt && data.saleEndAt && new Date(data.saleEndAt) < new Date(data.saleStartAt))
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['saleEndAt'], message: 'Thời gian kết thúc sale phải sau thời gian bắt đầu.' })
}

export const createProductSchema = z.object({ ...productFields, id: z.string().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/).optional() }).strict().superRefine(validateSale)
export const updateProductSchema = z.object(productFields).partial().strict().superRefine(validateSale)
