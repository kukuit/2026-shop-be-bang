import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'grapesjs/dist/css/grapes.min.css'
import HeaderTop from '@/components/HeaderTop'
import Providers from './providers'
import ChatWidget from '@/components/ChatWidget'
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
        <div className="min-h-screen flex relative">
          <input id="nav-toggle" type="checkbox" className="peer sr-only" />

          <div className="flex-1 flex flex-col">
            <HeaderTop />
            <div>
              <Providers>{children}</Providers>
            </div>

            <footer className="border-t border-pink-100 bg-pink-50/40">
              <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 text-sm text-slate-600">
                <div className="flex flex-col md:flex-row md:justify-center md:items-start gap-10 md:gap-16">
                  <div className="text-center md:text-left">
                    <p className="font-semibold text-slate-800">Shop Bé Băng</p>
                    <p className="mt-1">Quần áo trẻ em mềm xinh, dễ mặc mỗi ngày</p>
                    <p className="mt-1">Giao hàng toàn quốc</p>
                  </div>

                  <div className="text-center md:text-left">
                    <p className="font-semibold text-slate-800">Hotline:</p>
                    <p className="mt-1">0923 456 789</p>
                    <p className="mt-1">Email: hello@shopbebang.vn</p>
                  </div>
                </div>
              </div>
            </footer>
          </div>

          <label
            htmlFor="nav-toggle"
            className="fixed inset-0 bg-black/30 z-40 hidden peer-checked:block sm:hidden"
            aria-hidden="true"
          />
        </div>

        <ChatWidget />

        <GoogleAnalytics gaId="G-2EF1HMW0BP" />
      </body>
    </html>
  )
}
