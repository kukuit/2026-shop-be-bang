import 'server-only'
import { revalidatePath, revalidateTag } from 'next/cache'

export function invalidateProductCatalog() {
  revalidateTag('products-public')
  revalidateTag('categories-public')
  revalidatePath('/')
  revalidatePath('/products/[slug]', 'page')
  revalidatePath('/categories/[slug]', 'page')
}
