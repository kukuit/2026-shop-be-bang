import { z } from 'zod'
import { MAX_PRODUCT_IMAGE_COUNT } from './image-validation'
import { MAX_PRODUCT_VARIANTS, MAX_VARIANT_STOCK } from './variants'
import { MAX_COMBO_COMPONENTS } from './combos'

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => value ?? '')
const imageUrl = z.string().trim().max(2048).refine(value => value.startsWith('/') || /^https?:\/\//i.test(value), 'Ảnh cần là đường dẫn nội bộ hoặc URL http(s).')
const nullableDate = z.string().datetime({ offset: true }).nullable().optional().transform(value => value ?? null)
const stableId = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
const optionalRangeValue = z.number().finite().min(0).max(10000).optional()

const productAttributesSchema = z.object({
  gender: z.string().trim().max(40).optional(),
  material: z.string().trim().max(120).optional(),
  ageRange: z.string().trim().max(120).optional(),
  style: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(120).optional(),
  origin: z.string().trim().max(120).optional(),
  careInstructions: z.string().trim().max(1000).optional(),
}).strict()

const productSizeGuideRowSchema = z.object({
  id: stableId,
  size: z.string().trim().min(1, 'Mỗi dòng bảng size cần có tên size.').max(40),
  minWeight: optionalRangeValue,
  maxWeight: optionalRangeValue,
  minHeight: optionalRangeValue,
  maxHeight: optionalRangeValue,
}).strict()

const productVariantOptionSchema = z.object({
  id: stableId,
  name: z.string().trim().min(1, 'Tên màu và size không được để trống.').max(80),
  imageUrl: imageUrl.nullable().optional(),
}).strict()

const productVariantSchema = z.object({
  id: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/),
  sku: z.string().trim().min(1, 'SKU không được để trống.').max(100),
  colorId: stableId.optional(),
  color: z.string().trim().max(80).optional(),
  sizeId: stableId.optional(),
  size: z.string().trim().max(80).optional(),
  stock: z.number().int().min(0).max(MAX_VARIANT_STOCK),
  price: z.number().int().min(1).max(1_000_000_000).nullable().optional(),
  imageUrl: imageUrl.nullable().optional(),
}).strict()

const productVariantConfigSchema = z.object({
  colors: z.array(productVariantOptionSchema).max(MAX_PRODUCT_VARIANTS),
  sizes: z.array(productVariantOptionSchema).max(MAX_PRODUCT_VARIANTS),
}).strict()

const productComboComponentSchema = z.object({
  productId: z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/),
  variantId: z.string().trim().max(180).regex(/^[a-zA-Z0-9_-]+$/).nullable().optional(),
  quantity: z.number().int().min(1).max(99),
}).strict()
const productDiscountSchema = z.object({
  type: z.enum(['PERCENT', 'FIXED_AMOUNT']),
  value: z.number().int().min(1).max(1_000_000_000),
}).strict()

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
  showOnHomeBanner: z.boolean().default(false),
  arrivalAt: nullableDate,
  stock: z.number().int().min(0).max(MAX_PRODUCT_VARIANTS * 1_000_000),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1_000_000),
  attributes: productAttributesSchema.optional(),
  sizeGuide: z.array(productSizeGuideRowSchema).max(100).optional(),
  hasVariants: z.boolean().optional(),
  variantConfig: productVariantConfigSchema.optional(),
  variants: z.array(productVariantSchema).max(MAX_PRODUCT_VARIANTS).optional(),
  type: z.enum(['SIMPLE', 'COMBO']).default('SIMPLE'),
  components: z.array(productComboComponentSchema).max(MAX_COMBO_COMPONENTS).optional(),
  discount: productDiscountSchema.nullable().optional(),
  seoTitle: z.string().trim().max(200).optional().default(''),
  seoDescription: z.string().trim().max(320).optional().default(''),
}

function validateSale(data: { price?: number; salePrice?: number | null; saleStartAt?: string | null; saleEndAt?: string | null }, context: z.RefinementCtx) {
  if (data.price !== undefined && data.salePrice !== undefined && data.salePrice !== null && data.salePrice >= data.price)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['salePrice'], message: 'Giá sale phải thấp hơn giá gốc.' })
  if (data.saleStartAt && data.saleEndAt && new Date(data.saleEndAt) < new Date(data.saleStartAt))
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['saleEndAt'], message: 'Thời gian kết thúc sale phải sau thời gian bắt đầu.' })
}

function validateProductConfiguration(data: z.infer<z.ZodObject<typeof productFields>> & { id?: string }, context: z.RefinementCtx) {
  validateSale(data, context)
  if (data.type === 'COMBO') {
    if (!data.components?.length || (data.components ?? []).reduce((total, component) => total + component.quantity, 0) < 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ['components'], message: 'Combo cần có ít nhất 2 sản phẩm tính cả số lượng.' })
    if ((data.components?.length ?? 0) > MAX_COMBO_COMPONENTS) context.addIssue({ code: z.ZodIssueCode.custom, path: ['components'], message: `Combo có tối đa ${MAX_COMBO_COMPONENTS} thành phần.` })
    if (!data.discount) context.addIssue({ code: z.ZodIssueCode.custom, path: ['discount'], message: 'Hãy khai báo mức giảm cho combo.' })
    if (data.discount?.type === 'PERCENT' && data.discount.value >= 100) context.addIssue({ code: z.ZodIssueCode.custom, path: ['discount', 'value'], message: 'Mức giảm phần trăm phải nhỏ hơn 100%.' })
    const keys = new Set<string>()
    ;(data.components ?? []).forEach((component, index) => {
      const key = JSON.stringify([component.productId, component.variantId ?? null])
      if (keys.has(key)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['components', index], message: 'Gộp số lượng của cùng một sản phẩm và biến thể vào một dòng.' })
      keys.add(key)
    })
    if (data.hasVariants === true) context.addIssue({ code: z.ZodIssueCode.custom, path: ['hasVariants'], message: 'Combo không có biến thể hoặc tồn kho riêng.' })
  } else if ((data.components?.length ?? 0) > 0 || data.discount) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['type'], message: 'Sản phẩm thường không có thành phần combo hoặc mức giảm combo.' })
  }
  const guide = data.sizeGuide ?? []
  const sizeIds = new Set<string>()
  const guideSizes = new Set<string>()
  guide.forEach((row, index) => {
    const normalizedSize = row.size.trim().toLocaleLowerCase('vi-VN')
    if (sizeIds.has(row.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['sizeGuide', index, 'id'], message: 'ID dòng bảng size bị trùng.' })
    if (guideSizes.has(normalizedSize)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['sizeGuide', index, 'size'], message: 'Bảng size không được có dòng trùng size.' })
    sizeIds.add(row.id)
    guideSizes.add(normalizedSize)
    for (const [from, to] of [['minWeight', 'maxWeight'], ['minHeight', 'maxHeight']] as const) {
      if (row[from] !== undefined && row[to] !== undefined && row[from]! > row[to]!) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['sizeGuide', index, to], message: 'Giá trị “từ” không được lớn hơn giá trị “đến”.' })
      }
    }
  })

  const colors = data.variantConfig?.colors ?? []
  const sizes = data.variantConfig?.sizes ?? []
  const variants = data.variants ?? []
  if (data.hasVariants !== true) {
    if (variants.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants'], message: 'Hãy bật phân loại sản phẩm trước khi khai báo biến thể.' })
    return
  }

  if (!colors.length && !sizes.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['variantConfig'], message: 'Cần khai báo ít nhất một màu hoặc một size.' })
    return
  }
  const expectedCount = Math.max(1, colors.length) * Math.max(1, sizes.length)
  if (expectedCount > MAX_PRODUCT_VARIANTS) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['variantConfig'], message: `Một sản phẩm chỉ được có tối đa ${MAX_PRODUCT_VARIANTS} biến thể.` })
  }
  if (variants.length !== expectedCount || !variants.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants'], message: 'Bảng biến thể phải có đủ mọi tổ hợp màu và size.' })
  }

  const checkOptions = (options: typeof colors, path: 'colors' | 'sizes') => {
    const ids = new Set<string>()
    const names = new Set<string>()
    options.forEach((option, index) => {
      const normalizedName = option.name.trim().toLocaleLowerCase('vi-VN')
      if (ids.has(option.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variantConfig', path, index, 'id'], message: 'Mã lựa chọn bị trùng.' })
      if (names.has(normalizedName)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variantConfig', path, index, 'name'], message: 'Không được khai báo tên màu hoặc size trùng nhau.' })
      ids.add(option.id)
      names.add(normalizedName)
    })
  }
  checkOptions(colors, 'colors')
  checkOptions(sizes, 'sizes')

  const colorById = new Map(colors.map(option => [option.id, option]))
  const sizeById = new Map(sizes.map(option => [option.id, option]))
  const ids = new Set<string>()
  const skus = new Set<string>()
  const pairs = new Set<string>()
  const imageUrls = new Set(data.images.map(image => image.url))
  colors.forEach((color, index) => {
    if (color.imageUrl && !imageUrls.has(color.imageUrl)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variantConfig', 'colors', index, 'imageUrl'], message: 'Ảnh màu phải chọn từ ảnh sản phẩm hiện có.' })
  })
  variants.forEach((variant, index) => {
    const pair = `${variant.colorId ?? ''}\u0000${variant.sizeId ?? ''}`
    const normalizedSku = variant.sku.trim().toLocaleUpperCase('vi-VN')
    if (ids.has(variant.id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'id'], message: 'ID biến thể bị trùng.' })
    if (skus.has(normalizedSku)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'sku'], message: 'SKU không được trùng trong cùng sản phẩm.' })
    if (pairs.has(pair)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index], message: 'Tổ hợp màu và size bị trùng.' })
    ids.add(variant.id)
    skus.add(normalizedSku)
    pairs.add(pair)
    const color = variant.colorId ? colorById.get(variant.colorId) : undefined
    const size = variant.sizeId ? sizeById.get(variant.sizeId) : undefined
    if (colors.length && (!color || variant.color !== color.name) || !colors.length && (variant.colorId || variant.color)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'colorId'], message: 'Biến thể tham chiếu màu không hợp lệ.' })
    }
    if (sizes.length && (!size || variant.size !== size.name) || !sizes.length && (variant.sizeId || variant.size)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'sizeId'], message: 'Biến thể tham chiếu size không hợp lệ.' })
    }
    if (variant.imageUrl && !imageUrls.has(variant.imageUrl)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'imageUrl'], message: 'Ảnh biến thể phải chọn từ ảnh sản phẩm hiện có.' })
    }
  })
}

export const createProductSchema = z.object({ ...productFields, id: z.string().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/).optional() }).strict().superRefine(validateProductConfiguration)
export const updateProductSchema = z.object(productFields).partial().strict().superRefine(validateSale)
