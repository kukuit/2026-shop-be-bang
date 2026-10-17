# Product images on Cloudinary

Set these server-only variables in `.env.local` and the production runtime:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The Admin product form sends new files to `POST /api/admin/uploads/images` only after a valid Firestore product ID exists. The server validates the admin session, product ownership, request size, file count, MIME type, and JPEG/PNG/WebP file signature before using the signed Cloudinary SDK upload stream. Files are resized to fit within 1600 × 1600 while preserving their aspect ratio. Firestore stores the secure delivery URL, Cloudinary public ID, dimensions, format, alt text, and display order. Existing local and Firebase Storage URLs remain supported.

Removed Cloudinary assets are deleted only after the Firestore product update succeeds and no product references their public ID. To inspect assets left by interrupted uploads, run:

```sh
npm run products:cloudinary-orphans:dry-run
```

After reviewing the list, delete only unreferenced product images older than 24 hours with:

```sh
npm run products:cloudinary-orphans:delete
```

The cleanup command requires the Cloudinary and Firebase Admin environment variables. It performs a read-only dry run by default; `--apply` is the only deletion mode.
