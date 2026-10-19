export interface ProductImage {
  id: string
  url: string
  storagePath?: string
  publicId?: string
  width?: number
  height?: number
  format?: string
  alt?: string
  sortOrder: number
}

export interface ProductAttributes {
  gender?: string
  material?: string
  ageRange?: string
  style?: string
  brand?: string
  origin?: string
  careInstructions?: string
}

export interface ProductSizeGuide {
  id: string
  size: string
  minWeight?: number
  maxWeight?: number
  minHeight?: number
  maxHeight?: number
}

export interface ProductVariantOption {
  id: string
  name: string
  imageUrl?: string | null
}

export interface ProductVariantConfig {
  colors: ProductVariantOption[]
  sizes: ProductVariantOption[]
}

export interface ProductVariant {
  id: string
  sku: string
  colorId?: string
  color?: string
  sizeId?: string
  size?: string
  stock: number
  price?: number | null
  imageUrl?: string | null
}

export type ProductType = 'SIMPLE' | 'COMBO'
export type ProductDiscountType = 'PERCENT' | 'FIXED_AMOUNT'

export interface ProductComboComponent {
  productId: string
  variantId?: string | null
  quantity: number
}

export interface ProductComboSelection {
  componentIndex: number
  variantId: string
}

export interface ProductDiscount {
  type: ProductDiscountType
  value: number
}

export interface ResolvedProductComboComponent extends ProductComboComponent {
  componentIndex: number
  productName: string
  productSlug: string
  imageUrl: string
  hasVariants: boolean
  variants?: ProductVariant[]
  color?: string | null
  size?: string | null
  unitPrice: number
  stockAvailable: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string
  categoryId: string
  thumbnail: string
  images: ProductImage[]
  price: number
  salePrice: number | null
  saleStartAt: string | null
  saleEndAt: string | null
  isNewArrival: boolean
  showOnHomeBanner: boolean
  arrivalAt: string | null
  stock: number
  isActive: boolean
  sortOrder: number
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
  type?: ProductType
  components?: ProductComboComponent[]
  discount?: ProductDiscount | null
  comboSubtotal?: number
  discountAmount?: number
  resolvedComponents?: ResolvedProductComboComponent[]
  seoTitle?: string
  seoDescription?: string
  attributes?: ProductAttributes
  sizeGuide?: ProductSizeGuide[]
  hasVariants?: boolean
  variantConfig?: ProductVariantConfig
  variants?: ProductVariant[]
}

export type ProductInput = Omit<Product, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  id?: string
}

export type PublicProductImage = Omit<ProductImage, 'storagePath'>

export interface PublicProduct extends Omit<Product, 'stock' | 'sortOrder' | 'deletedAt' | 'isActive' | 'createdAt' | 'updatedAt' | 'images'> {
  images: PublicProductImage[]
  inStock: boolean
  availableCombos?: number
  comboImageFallback?: boolean
}

export interface HomeBannerProduct {
  id: string
  name: string
  slug: string
  images: Array<{ url: string; publicId?: string; alt?: string }>
  price: number
  salePrice: number | null
  saleStartAt: string | null
  saleEndAt: string | null
}
