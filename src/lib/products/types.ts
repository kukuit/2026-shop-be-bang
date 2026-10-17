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
  arrivalAt: string | null
  stock: number
  isActive: boolean
  sortOrder: number
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
}

export type ProductInput = Omit<Product, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  id?: string
}

export type PublicProductImage = Omit<ProductImage, 'storagePath'>

export interface PublicProduct extends Omit<Product, 'stock' | 'sortOrder' | 'deletedAt' | 'isActive' | 'createdAt' | 'updatedAt' | 'images'> {
  images: PublicProductImage[]
  inStock: boolean
}
