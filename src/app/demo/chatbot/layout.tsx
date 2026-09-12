import type { Metadata } from 'next'
import Shell from './_components/Shell'
import './demo.css'
export const metadata: Metadata = { title: 'AquaManager · Quản lý nuôi tôm', robots: { index: false, follow: false } }
export default function DemoLayout({ children }: { children: React.ReactNode }) { return <Shell>{children}</Shell> }
