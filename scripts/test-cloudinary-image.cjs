const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const utilityPath = path.join(__dirname, '..', 'src', 'lib', 'cloudinary-image.ts')
const source = fs.readFileSync(utilityPath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const utilityModule = { exports: {} }
new Function('exports', 'require', 'module', compiled)(utilityModule.exports, require, utilityModule)
const { createCloudinaryImageLoader, getCloudinaryImageUrl, isCloudinaryImageUrl } = utilityModule.exports

const original = 'https://res.cloudinary.com/demo/image/upload/v123/products/baby/item.webp'
assert.equal(isCloudinaryImageUrl(original), true)
assert.equal(isCloudinaryImageUrl('/images/local-item.webp'), false)

assert.equal(
  getCloudinaryImageUrl(original, { width: 112, height: 112, crop: 'fill', gravity: 'auto' }),
  'https://res.cloudinary.com/demo/image/upload/c_fill,w_112,h_112,g_auto,q_auto,f_auto/v123/products/baby/item.webp',
)

const pretransformed = 'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_800,g_auto/f_auto/q_auto:good/v123/products/item.webp'
const resized = getCloudinaryImageUrl(pretransformed, { width: 160, height: 160, crop: 'fill', gravity: 'auto' })
assert.equal(resized, 'https://res.cloudinary.com/demo/image/upload/c_fill,w_160,h_160,g_auto,q_auto,f_auto/v123/products/item.webp')
assert.equal((resized.match(/(?:^|[,/])w_160(?:[,/]|$)/g) ?? []).length, 1)
assert.equal((resized.match(/(?:^|[,/])q_auto(?:[,/]|$)/g) ?? []).length, 1)

const fitted = getCloudinaryImageUrl(original, { width: 800, crop: 'fit' })
assert.equal(fitted, 'https://res.cloudinary.com/demo/image/upload/c_fit,w_800,q_auto,f_auto/v123/products/baby/item.webp')
assert.equal(getCloudinaryImageUrl('https://images.example.test/a.webp', { width: 160 }), 'https://images.example.test/a.webp')
assert.equal(getCloudinaryImageUrl('not a url', { width: 160 }), 'not a url')
assert.equal(getCloudinaryImageUrl(original, { width: 0 }), original)

const signed = 'https://res.cloudinary.com/demo/image/upload/s--signature--/v123/products/item.webp'
assert.equal(getCloudinaryImageUrl(signed, { width: 160 }), signed)
const named = 'https://res.cloudinary.com/demo/image/upload/t_product_thumb/v123/products/item.webp'
assert.equal(getCloudinaryImageUrl(named, { width: 160 }), named)

const loader = createCloudinaryImageLoader({ crop: 'fill', aspectRatio: 4 / 3, gravity: 'auto' })
assert.equal(loader({ src: original, width: 600 }), 'https://res.cloudinary.com/demo/image/upload/c_fill,w_600,h_450,g_auto,q_auto,f_auto/v123/products/baby/item.webp')

console.log('Cloudinary image URL checks passed.')
