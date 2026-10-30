import type {
  Product,
  ProductAttributes,
  ProductSizeGuide,
  ProductVariant,
  ProductVariantConfig,
  ProductVariantOption,
} from './types'
import { getVariantEffectivePrice } from './pricing'
import { slugify } from './slug'

export const MAX_PRODUCT_VARIANTS = 100
export const MAX_VARIANT_STOCK = 1_000_000

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

function optionalText(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().slice(0, maxLength)
  return normalized || undefined
}

function normalizeOption(value: unknown): ProductVariantOption | null {
  const item = record(value)
  const id = optionalText(item.id, 100)
  const name = optionalText(item.name, 80)
  if (!id || !name) return null
  const imageUrl = optionalText(item.imageUrl, 2048)
  return { id, name, ...(imageUrl ? { imageUrl } : {}) }
}

export function normalizeProductAttributes(value: unknown): ProductAttributes | undefined {
  const item = record(value)
  const attributes: ProductAttributes = {
    ...(optionalText(item.gender, 40) ? { gender: optionalText(item.gender, 40) } : {}),
    ...(optionalText(item.material, 120) ? { material: optionalText(item.material, 120) } : {}),
    ...(optionalText(item.ageRange, 120) ? { ageRange: optionalText(item.ageRange, 120) } : {}),
    ...(optionalText(item.style, 120) ? { style: optionalText(item.style, 120) } : {}),
    ...(optionalText(item.brand, 120) ? { brand: optionalText(item.brand, 120) } : {}),
    ...(optionalText(item.origin, 120) ? { origin: optionalText(item.origin, 120) } : {}),
    ...(optionalText(item.careInstructions, 1000) ? { careInstructions: optionalText(item.careInstructions, 1000) } : {}),
  }
  return Object.keys(attributes).length ? attributes : undefined
}

export function normalizeProductSizeGuide(value: unknown): ProductSizeGuide[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows = value.flatMap((raw): ProductSizeGuide[] => {
    const item = record(raw)
    const id = optionalText(item.id, 100)
    const size = optionalText(item.size, 40)
    if (!id || !size) return []
    const numeric = (field: string) => typeof item[field] === 'number' && Number.isFinite(item[field]) && item[field] >= 0
      ? item[field] as number
      : undefined
    return [{
      id,
      size,
      ...(numeric('minWeight') !== undefined ? { minWeight: numeric('minWeight') } : {}),
      ...(numeric('maxWeight') !== undefined ? { maxWeight: numeric('maxWeight') } : {}),
      ...(numeric('minHeight') !== undefined ? { minHeight: numeric('minHeight') } : {}),
      ...(numeric('maxHeight') !== undefined ? { maxHeight: numeric('maxHeight') } : {}),
    }]
  })
  return rows.length ? rows : undefined
}

export function normalizeProductVariantConfig(value: unknown): ProductVariantConfig | undefined {
  const item = record(value)
  const colors = Array.isArray(item.colors) ? item.colors.map(normalizeOption).filter((option): option is ProductVariantOption => Boolean(option)) : []
  const sizes = Array.isArray(item.sizes) ? item.sizes.map(normalizeOption).filter((option): option is ProductVariantOption => Boolean(option)) : []
  return colors.length || sizes.length ? { colors, sizes } : undefined
}

export function normalizeProductVariants(value: unknown): ProductVariant[] | undefined {
  if (!Array.isArray(value)) return undefined
  const variants = value.slice(0, MAX_PRODUCT_VARIANTS).flatMap((raw): ProductVariant[] => {
    const item = record(raw)
    const id = optionalText(item.id, 200)
    const sku = optionalText(item.sku, 100)
    const stock = Number(item.stock)
    if (!id || !sku || !Number.isSafeInteger(stock) || stock < 0 || stock > MAX_VARIANT_STOCK) return []
    const colorId = optionalText(item.colorId, 100)
    const color = optionalText(item.color, 80)
    const sizeId = optionalText(item.sizeId, 100)
    const size = optionalText(item.size, 80)
    const price = item.price === null || item.price === undefined ? item.price : Number(item.price)
    if (price !== null && price !== undefined && (!Number.isSafeInteger(price) || price < 1)) return []
    const imageUrl = optionalText(item.imageUrl, 2048)
    return [{
      id,
      sku,
      ...(colorId ? { colorId } : {}),
      ...(color ? { color } : {}),
      ...(sizeId ? { sizeId } : {}),
      ...(size ? { size } : {}),
      stock,
      ...(price !== undefined ? { price } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    }]
  })
  return variants.length ? variants : undefined
}

export function normalizeProductData(value: unknown): Pick<Product, 'stock' | 'attributes' | 'sizeGuide' | 'hasVariants' | 'variantConfig' | 'variants'> {
  const data = record(value)
  const hasVariants = data.hasVariants === true
  const variants = normalizeProductVariants(data.variants)
  const attributes = normalizeProductAttributes(data.attributes)
  const sizeGuide = normalizeProductSizeGuide(data.sizeGuide)
  const variantConfig = normalizeProductVariantConfig(data.variantConfig)
  return {
    stock: hasVariants ? calculateTotalStock(variants ?? []) : Number.isSafeInteger(data.stock) && Number(data.stock) >= 0 ? Number(data.stock) : 0,
    hasVariants,
    ...(attributes ? { attributes } : {}),
    ...(sizeGuide ? { sizeGuide } : {}),
    ...(variantConfig ? { variantConfig } : {}),
    ...(variants ? { variants } : {}),
  }
}

export function calculateTotalStock(variants: readonly Pick<ProductVariant, 'stock'>[] = []) {
  return variants.reduce((total, variant) => total + (Number.isSafeInteger(variant.stock) && variant.stock > 0 ? variant.stock : 0), 0)
}

export function generateVariantCombinations(
  config: ProductVariantConfig,
  existingVariants: readonly ProductVariant[],
  productSlug: string,
): ProductVariant[] | null {
  const colors = config.colors
  const sizes = config.sizes
  const count = Math.max(1, colors.length) * Math.max(1, sizes.length)
  if (count > MAX_PRODUCT_VARIANTS) return null
  if (!colors.length && !sizes.length) return []

  const previous = new Map(existingVariants.map(variant => [`${variant.colorId ?? ''}\u0000${variant.sizeId ?? ''}`, variant]))
  const next: ProductVariant[] = []
  for (const color of colors.length ? colors : [undefined]) {
    for (const size of sizes.length ? sizes : [undefined]) {
      const key = `${color?.id ?? ''}\u0000${size?.id ?? ''}`
      const current = previous.get(key)
      const id = current?.id ?? `variant_${color?.id ?? 'no-color'}_${size?.id ?? 'no-size'}`
      next.push({
        id,
        sku: current?.sku ?? buildVariantSku(productSlug, color?.name, size?.name),
        ...(color ? { colorId: color.id, color: color.name } : {}),
        ...(size ? { sizeId: size.id, size: size.name } : {}),
        stock: current?.stock ?? 0,
        ...(current?.price !== undefined ? { price: current.price } : {}),
        ...(current?.imageUrl ? { imageUrl: current.imageUrl } : {}),
      })
    }
  }
  return next
}

export function syncVariantSizesWithSizeGuide(
  sizeGuide: readonly ProductSizeGuide[],
  currentConfig: ProductVariantConfig,
  currentVariants: readonly ProductVariant[],
  productSlug: string,
) {
  const sizes = sizeGuide.map(row => ({ id: row.id, name: row.size }))
  const idMap = new Map<string, ProductVariantOption>()
  for (const row of sizeGuide) {
    const normalizedName = row.size.trim().normalize('NFC').toLocaleLowerCase('vi-VN')
    const previous = currentConfig.sizes.find(option => option.id === row.id)
      ?? currentConfig.sizes.find(option => option.name.trim().normalize('NFC').toLocaleLowerCase('vi-VN') === normalizedName)
    const previousVariant = currentVariants.find(variant => variant.sizeId && variant.size?.trim().normalize('NFC').toLocaleLowerCase('vi-VN') === normalizedName)
    const previousId = previous?.id ?? previousVariant?.sizeId
    if (previousId) idMap.set(previousId, { id: row.id, name: row.size })
  }
  const remappedVariants = currentVariants.map(variant => {
    const variantName = variant.size?.trim().normalize('NFC').toLocaleLowerCase('vi-VN')
    const next = (variant.sizeId ? idMap.get(variant.sizeId) : undefined)
      ?? sizes.find(size => size.name.trim().normalize('NFC').toLocaleLowerCase('vi-VN') === variantName)
    return next ? { ...variant, sizeId: next.id, size: next.name } : variant
  })
  const config = { ...currentConfig, sizes }
  const variants = generateVariantCombinations(config, remappedVariants, productSlug)
  return { config, variants }
}

export function buildVariantSku(productSlug: string, color?: string, size?: string) {
  const parts = [productSlug, color, size].filter(Boolean).map(value => slugify(value ?? '').replace(/-/g, '').toLocaleUpperCase('en-US'))
  return parts.join('-').slice(0, 100) || 'PRODUCT'
}

export function findSelectedVariant(
  config: ProductVariantConfig | undefined,
  variants: readonly ProductVariant[] | undefined,
  colorId?: string,
  sizeId?: string,
) {
  if (!config || !variants) return null
  if (config.colors.length && !colorId || config.sizes.length && !sizeId) return null
  return variants.find(variant => (variant.colorId ?? '') === (colorId ?? '') && (variant.sizeId ?? '') === (sizeId ?? '')) ?? null
}

export function resolveVariantPrice(
  product: Pick<Product, 'price' | 'salePrice' | 'saleStartAt' | 'saleEndAt'>,
  variant: Pick<ProductVariant, 'price'> | null | undefined,
  now: Date,
) {
  return getVariantEffectivePrice(product, variant, now)
}

export function resolveVariantImage(
  variant: Pick<ProductVariant, 'imageUrl'> | null | undefined,
  color: Pick<ProductVariantOption, 'imageUrl'> | null | undefined,
  productThumbnail: string,
) {
  return variant?.imageUrl || color?.imageUrl || productThumbnail
}
