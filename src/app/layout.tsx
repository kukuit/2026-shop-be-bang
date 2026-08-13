import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'grapesjs/dist/css/grapes.min.css'
import Providers from './providers'
import SiteShell from '@/components/SiteShell'
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Shop Bé Băng | Quần Áo Trẻ Em',
    template: '%s | Shop Bé Băng',
  },
  description:
    'Shop Bé Băng chuyên quần áo trẻ em mềm xinh, dễ mặc mỗi ngày: váy bé gái, set đồ, đồ sơ sinh và phụ kiện cho bé.',
  applicationName: 'Shop Bé Băng',
  category: 'shopping',
  keywords: [
    'Shop Bé Băng',
    'quần áo trẻ em',
    'đồ trẻ em',
    'váy bé gái',
    'set đồ trẻ em',
    'đồ sơ sinh',
  ],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
    apple: [{ url: '/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Shop Bé Băng | Quần Áo Trẻ Em',
    description:
      'Quần áo trẻ em mềm xinh, dễ mặc mỗi ngày: váy bé gái, set đồ, đồ sơ sinh và phụ kiện cho bé.',
    siteName: 'Shop Bé Băng',
    locale: 'vi_VN',
    type: 'website',
    images: [
      {
        url: '/images/products/product-0001.webp',
        width: 1200,
        height: 630,
        alt: 'Shop Bé Băng',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop Bé Băng | Quần Áo Trẻ Em',
    description: 'Quần áo trẻ em mềm xinh, dễ mặc mỗi ngày.',
    images: ['/images/products/product-0001.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export const viewport: Viewport = {
  themeColor: '#f7357f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>

        <GoogleAnalytics gaId="G-2EF1HMW0BP" />
      </body>
    </html>
  )
}
