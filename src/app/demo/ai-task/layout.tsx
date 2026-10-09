import type { Metadata } from 'next'
import Shell from './_components/Shell'
import '../aqua/demo.css'
import './task.css'

export const metadata: Metadata = { title: 'Quản lý dạy thêm', manifest: '/demo/ai-task/manifest.webmanifest', robots: { index: false, follow: false } }

export default function Layout({ children }: { children: React.ReactNode }) { return <Shell>{children}</Shell> }
