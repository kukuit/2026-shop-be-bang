export type HomeProduct = {
  id: string
  name: string
  image: string
  price: number
  oldPrice?: number
  salePercent?: number
}

// Temporary homepage content. Replace with real product data when the catalog is ready.
// The current product folder contains one placeholder photo copied under four filenames.
export const newArrivalProducts: HomeProduct[] = [
  {
    id: 'new-1',
    name: 'Set áo thun và chân váy hồng',
    image: '/images/products/product-0001.webp',
    price: 289000,
  },
  {
    id: 'new-2',
    name: 'Bộ mặc nhà Weekend Club',
    image: '/images/products/product-0002.webp',
    price: 259000,
  },
  {
    id: 'new-3',
    name: 'Set đi chơi dịu dàng cho bé',
    image: '/images/products/product-0003.webp',
    price: 329000,
  },
  {
    id: 'new-4',
    name: 'Set hồng xinh cuối tuần',
    image: '/images/products/product-0004.webp',
    price: 279000,
  },
]

export const saleProducts: HomeProduct[] = [
  {
    id: 'sale-1',
    name: 'Set áo thun chân váy bé gái',
    image: '/images/products/product-0004.webp',
    price: 199000,
    oldPrice: 390000,
    salePercent: 49,
  },
  {
    id: 'sale-2',
    name: 'Bộ Weekend Club năng động',
    image: '/images/products/product-0002.webp',
    price: 219000,
    oldPrice: 340000,
    salePercent: 36,
  },
  {
    id: 'sale-3',
    name: 'Set hồng xinh cho ngày dạo phố',
    image: '/images/products/product-0003.webp',
    price: 179000,
    oldPrice: 299000,
    salePercent: 40,
  },
  {
    id: 'sale-4',
    name: 'Bộ bé gái mặc đẹp mỗi ngày',
    image: '/images/products/product-0001.webp',
    price: 199000,
    oldPrice: 359000,
    salePercent: 45,
  },
]
