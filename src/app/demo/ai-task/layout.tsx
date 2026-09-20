import type { Metadata } from 'next'
import Shell from './_components/Shell'
import '../aqua/demo.css'
import './task.css'

export const metadata: Metadata = { title: 'AI Công việc · Công việc cá nhân', robots: { index: false, follow: false } }
export default function Layout({ children }: { children: React.ReactNode }) { return <Shell>{children}</Shell> }
