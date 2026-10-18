export type CloudinaryCropMode = 'fill' | 'fit' | 'pad'

export interface CloudinaryImageOptions {
  width: number
  height?: number
  crop?: CloudinaryCropMode
  gravity?: string
}

const transformationParameters = new Set([
  'a', 'ac', 'af', 'ar', 'b', 'bo', 'br', 'c', 'co', 'cs', 'd', 'dl', 'dn', 'du',
  'dpr', 'e', 'eo', 'f', 'fl', 'fps', 'g', 'h', 'if', 'ki', 'l', 'o', 'p', 'pg',
  'q', 'r', 'so', 'sp', 't', 'u', 'vc', 'vs', 'w', 'x', 'y', 'z',
])

const resizeParameterKeys = new Set(['ar', 'c', 'dpr', 'w', 'h', 'q', 'f', 'g'])

export function isCloudinaryImageUrl(source: string) {
  try {
    const url = new URL(source)
    return url.protocol === 'https:'
      && url.hostname === 'res.cloudinary.com'
      && url.pathname.split('/').some((part, index, parts) => part === 'image' && parts[index + 1] === 'upload')
  } catch {
    return false
  }
}

function isTransformationSegment(segment: string) {
  if (!segment || segment.startsWith('s--')) return false
  return segment.split(',').every(token => {
    if (/^\$[a-z][a-z0-9]*_/i.test(token)) return true
    const separator = token.indexOf('_')
    return separator > 0 && transformationParameters.has(token.slice(0, separator).toLowerCase())
  })
}

function parameterKey(token: string) {
  const separator = token.indexOf('_')
  return separator > 0 ? token.slice(0, separator).toLowerCase() : ''
}

export function getCloudinaryImageUrl(source: string, options: CloudinaryImageOptions) {
  if (!isCloudinaryImageUrl(source)) return source

  const width = Math.round(options.width)
  const height = options.height === undefined ? undefined : Math.round(options.height)
  if (!Number.isSafeInteger(width) || width < 1 || height !== undefined && (!Number.isSafeInteger(height) || height < 1)) return source

  try {
    const url = new URL(source)
    const parts = url.pathname.split('/')
    const uploadIndex = parts.findIndex((part, index) => part === 'image' && parts[index + 1] === 'upload')
    if (uploadIndex < 0) return source

    const transformsStart = uploadIndex + 2
    if (parts[transformsStart]?.startsWith('s--')) return source

    let transformsEnd = transformsStart
    while (isTransformationSegment(parts[transformsEnd] ?? '')) transformsEnd += 1
    const existingTransforms = parts.slice(transformsStart, transformsEnd)

    // A named transformation is opaque, so keep that URL intact instead of guessing at its contents.
    if (existingTransforms.some(segment => segment.split(',').some(token => token.startsWith('t_')))) return source

    const previousGravity = existingTransforms
      .flatMap(segment => segment.split(','))
      .find(token => parameterKey(token) === 'g')
      ?.slice(2)
    const preservedTransforms = existingTransforms
      .map(segment => segment.split(',').filter(token => {
        const key = parameterKey(token)
        return !resizeParameterKeys.has(key)
      }))
      .filter(tokens => tokens.length > 0)
      .map(tokens => tokens.join(','))

    const crop = options.crop ?? 'fill'
    const requestedTransform = [
      `c_${crop}`,
      `w_${width}`,
      ...(height === undefined ? [] : [`h_${height}`]),
      ...(options.gravity ?? (crop === 'fill' ? previousGravity : undefined) ? [`g_${options.gravity ?? previousGravity}`] : []),
      'q_auto',
      'f_auto',
    ].join(',')

    parts.splice(transformsStart, transformsEnd - transformsStart, ...preservedTransforms, requestedTransform)
    url.pathname = parts.join('/')
    return url.toString()
  } catch {
    return source
  }
}

export function createCloudinaryImageLoader(options: Omit<CloudinaryImageOptions, 'width' | 'height'> & { aspectRatio?: number }) {
  return ({ src, width }: { src: string; width: number }) => getCloudinaryImageUrl(src, {
    width,
    ...(options.aspectRatio && Number.isFinite(options.aspectRatio) && options.aspectRatio > 0
      ? { height: Math.round(width / options.aspectRatio) }
      : {}),
    crop: options.crop,
    gravity: options.gravity,
  })
}
