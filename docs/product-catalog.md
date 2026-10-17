# Product catalog

## Firestore data

Catalog documents are stored with Firebase Admin SDK at:

- `shopbebangcom/store/productCategories/{categoryId}`
- `shopbebangcom/store/products/{productId}`

Categories store `name`, normalized `nameSearch`, `slug`, `description`, `imageUrl`, optional internal `imageStoragePath`, `parentId`, `sortOrder`, `isActive`, and `createdAt`/`updatedAt` timestamps. `productCount` is maintained transactionally to support the Admin list; deleting a category also checks child categories and product documents.

Products store the fields in `src/lib/products/types.ts`. Prices are integer VND. The public sale price and its schedule remain separate from `price`; the current sale state is calculated when the response is built. `salePercent` is never stored. Deleting a product sets `deletedAt` and hides it; it does not delete media. Product and category timestamps are Firestore `Timestamp` values and are returned as ISO strings by the services.

## Routes

Admin pages:

- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/product-categories`

Admin API endpoints require an active Admin session on the server:

- `GET/POST /api/admin/products`
- `GET/PATCH/DELETE /api/admin/products/[id]`
- `GET/POST /api/admin/product-categories`
- `GET/PATCH/DELETE /api/admin/product-categories/[id]`
- `POST /api/admin/product-categories/defaults` (creates any missing default categories)
- `POST/DELETE /api/admin/product-images`

Public endpoints:

- `GET /api/products?filter=new|sale&categorySlug=do-tole&sort=newest&limit=20&cursor=...`
- `GET /api/products/[slug]`
- `GET /api/product-categories`
- `GET /api/product-categories/[slug]/products?sort=newest&limit=20&cursor=...`
- `/categories/[slug]` and `/products/[slug]`

Public APIs return only active, undeleted products assigned to active categories whose ancestors are also active. Admin lists use bounded Firestore cursor scans (at most 500 source documents per request) when applying filters that Firestore cannot represent together without a large family of composite indexes.

## Firebase setup and deployment

Set the existing Admin credentials and the Storage bucket in the server environment:

```text
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
```

Use the bucket's actual name from Firebase Console; older projects may use a `.appspot.com` name. The Admin service account needs Firestore read/write and Firebase Storage object read/write permissions. These values are server-only and must not use a `NEXT_PUBLIC_` prefix.

Deploy the committed composite indexes with:

```bash
firebase deploy --only firestore:indexes
```

`firestore.rules` is not configured here because the app's existing Firestore rules are not part of this repository. Catalog requests use only the Admin SDK on the server, which bypasses Firestore Rules, so every Admin API mutation checks `requireAdmin()` and cross-site request protections. Before production, verify the project's deployed Firestore rules deny direct client access to these catalog paths; add these matches to the existing ruleset if they are not already covered:

```text
match /shopbebangcom/store/products/{productId} {
  allow read, write: if false;
}
match /shopbebangcom/store/productCategories/{categoryId} {
  allow read, write: if false;
}
```

Do not add direct client-SDK catalog writes without explicit rules for them.

`storage.rules` denies direct client SDK reads and writes. Product images are uploaded and removed by Admin-only server routes. The returned Firebase download-token URLs are public read URLs for storefront images; Storage tokens are not exposed as Admin credentials. Deploy Storage rules with:

```bash
firebase deploy --only storage
```

## Manual legacy migration

The migration reads `src/data/home-products.ts`, links the 8 legacy entries to the default categories, and skips deterministic `legacy_{id}` product documents that already exist. It does not overwrite products. A dry run is the default:

```bash
npm run products:migrate-home:dry-run
npm run products:migrate-home
```

The second command passes `--apply` and writes to Firestore. It creates missing default categories but does not replace a category with the same slug. Sale entries map the old price to `price` and the current price to `salePrice`. The old local image URLs remain in place, `stock` starts at zero because the old fixtures had no stock data, and sale dates are empty. The app never runs this migration automatically.

## Cache behavior

Server component data uses Next.js 14 `unstable_cache` with a five-minute revalidation window. Admin product/category mutations invalidate the `products-public` and `categories-public` tags and the home, category, and product paths. Public product APIs use a 60-second CDN cache; category responses use 5 minutes. Sale candidate data may be cached for 5 minutes, but the start/end timestamps are evaluated against the current time on each render/response, so scheduled sales are not frozen in cache.

## Checks

Run `npm run test:product-catalog`, `npm run typecheck`, `npm run lint`, and `npm run build`. The test script covers validation, pricing boundaries, visibility rules, parent cycles, migration idempotence, and Admin API authorization. CRUD integration checks run when `FIRESTORE_EMULATOR_HOST` points to a running Firestore emulator; otherwise that test is skipped.
