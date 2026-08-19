type AssetManifest = {
  images?: string[]
  audio?: string[]
}

const LOAD_TIMEOUT = 15_000

const withTimeout = (load: (finish: () => void) => void) => new Promise<void>((resolve) => {
  let settled = false
  const timer = window.setTimeout(finish, LOAD_TIMEOUT)

  function finish() {
    if (settled) return
    settled = true
    window.clearTimeout(timer)
    resolve()
  }

  load(finish)
})

const preloadImage = (src: string) => withTimeout((finish) => {
  const image = new Image()
  image.onload = () => {
    if (typeof image.decode === 'function') void image.decode().catch(() => undefined).finally(finish)
    else finish()
  }
  image.onerror = finish
  image.src = src
})

const preloadAudio = (src: string) => withTimeout((finish) => {
  const audio = new Audio()
  const done = () => {
    audio.removeEventListener('canplaythrough', done)
    audio.removeEventListener('error', done)
    finish()
  }
  audio.preload = 'auto'
  audio.addEventListener('canplaythrough', done, { once: true })
  audio.addEventListener('error', done, { once: true })
  audio.src = src
  audio.load()
})

export async function preloadAssets(
  { images = [], audio = [] }: AssetManifest,
  onProgress: (progress: number) => void,
) {
  const loaders = [
    ...images.map((src) => () => preloadImage(src)),
    ...audio.map((src) => () => preloadAudio(src)),
  ]

  if (loaders.length === 0) {
    onProgress(100)
    return
  }

  let loaded = 0
  onProgress(0)
  await Promise.all(loaders.map(async (load) => {
    await load()
    loaded += 1
    onProgress(loaded / loaders.length * 100)
  }))
}
