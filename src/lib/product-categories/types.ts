export interface ProductCategory {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string
  imageStoragePath?: string
  parentId: string | null
  sortOrder: number
  isActive: boolean
  productCount: number
  createdAt: string | null
  updatedAt: string | null
}

export interface ProductCategoryInput {
  id?: string
  name: string
  slug: string
  description?: string
  imageUrl?: string | null
  imageStoragePath?: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
}
