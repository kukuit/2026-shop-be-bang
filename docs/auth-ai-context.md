# Authentication context for AI review

## Review request

Audit the authentication and authorization implementation in this Next.js repository. Separate what is implemented from placeholders, identify exposed pages/API routes and trust-boundary issues, then propose a prioritized implementation plan. Cite file paths and relevant code in every finding. Do not assume Firebase Firestore usage means Firebase Authentication is enabled.

Answer these questions:

1. Which login, logout, registration, session, identity verification, and role checks actually exist?
2. Which admin pages and mutation/read APIs are reachable without authentication or authorization?
3. Can a client choose or spoof `userId`? Where?
4. Which dependencies, environment variables, database fields, and UI placeholders are present but unused for auth?
5. What is the smallest secure architecture for customer/student and admin access?
6. Give an implementation checklist and security tests, ordered P0/P1/P2.

## API route inventory

- `src/app/api/admin/users/[userId]/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/game-tracking/progress/route.ts`
- `src/app/api/game-tracking/sessions/route.ts`
- `src/app/api/mktonline-orders/route.ts`

## Authentication-related source

### package.json

```json
{
  "name": "shop-be-bang",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "vercel-build": "prisma generate && prisma migrate deploy && next build",
    "typecheck": "tsc --noEmit",
    "build:local": "prisma generate && npm run typecheck && next build",
    "start:local": "NODE_ENV=production next start -p 3000",
    "auth:context": "node scripts/auth-ai-context.mjs"
  },
  "dependencies": {
    "@next/third-parties": "^16.1.1",
    "@prisma/client": "^6.17.0",
    "@tanstack/react-query": "^5.90.5",
    "firebase-admin": "^13.6.0",
    "framer-motion": "^12.23.24",
    "lucide-react": "^0.545.0",
    "next": "14.2.3",
    "phaser": "^3.90.0",
    "react": "^18",
    "react-dom": "^18",
    "react-email-editor": "^1.7.11",
    "recharts": "^3.1.2",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.90.2",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.3",
    "postcss": "^8",
    "prettier": "^3.6.2",
    "prisma": "^6.17.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}

```

### scripts/auth-ai-context.mjs

```mjs
import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const args = process.argv.slice(2)
const outputIndex = args.indexOf('--output')
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null

const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.prisma', '.md'])
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage'])
const ignoredFiles = /(^|\/)(\.env(?:\..*)?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|auth-ai-context\.md)$/i
const authSignal = /auth|login|logout|sign[ -]?in|sign[ -]?out|register|session|cookie|token|bearer|password|currentUser|userId|admin|firebase/i
const secretLine = /(private[_ -]?key|client[_ -]?secret|api[_ -]?key|password|authorization)\s*[:=]/i

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute))
    else files.push(absolute)
  }
  return files
}

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/')
}

function redact(content) {
  return content.split(/\r?\n/).map(line => secretLine.test(line) && !line.includes('process.env')
    ? `${line.match(/^\s*/)?.[0] ?? ''}[REDACTED SECRET-LIKE LINE]`
    : line).join('\n')
}

const allFiles = await walk(root)
const candidates = []
for (const file of allFiles) {
  const name = relative(file)
  if (ignoredFiles.test(name) || !extensions.has(path.extname(file))) continue
  const content = await fs.readFile(file, 'utf8')
  if (authSignal.test(name) || authSignal.test(content)) candidates.push({ name, content })
}

const important = candidates.filter(({ name, content }) =>
  /(^|\/)(middleware|package)\.(ts|json)$/.test(name) ||
  /src\/(app\/api|app\/admin|app\/game\/admin|lib\/users|lib\/firebaseAdmin|components\/games\/general\/tracking)/.test(name) ||
  /login|logout|sign[ -]?in|sign[ -]?out|register|auth/i.test(content)
)

const routeFiles = allFiles.map(relative).filter(name => /^src\/app\/api\/.+\/route\.ts$/.test(name)).sort()
const report = [
  '# Authentication context for AI review',
  '',
  '## Review request',
  '',
  'Audit the authentication and authorization implementation in this Next.js repository. Separate what is implemented from placeholders, identify exposed pages/API routes and trust-boundary issues, then propose a prioritized implementation plan. Cite file paths and relevant code in every finding. Do not assume Firebase Firestore usage means Firebase Authentication is enabled.',
  '',
  'Answer these questions:',
  '',
  '1. Which login, logout, registration, session, identity verification, and role checks actually exist?',
  '2. Which admin pages and mutation/read APIs are reachable without authentication or authorization?',
  '3. Can a client choose or spoof `userId`? Where?',
  '4. Which dependencies, environment variables, database fields, and UI placeholders are present but unused for auth?',
  '5. What is the smallest secure architecture for customer/student and admin access?',
  '6. Give an implementation checklist and security tests, ordered P0/P1/P2.',
  '',
  '## API route inventory',
  '',
  ...routeFiles.map(name => `- \`${name}\``),
  '',
  '## Authentication-related source',
  '',
  ...important.sort((a, b) => a.name.localeCompare(b.name)).flatMap(({ name, content }) => [
    `### ${name}`,
    '',
    `\`\`\`${path.extname(name).slice(1) || 'text'}`,
    redact(content),
    '\`\`\`',
    '',
  ]),
].join('\n')

if (outputPath) {
  const absoluteOutput = path.resolve(root, outputPath)
  const relativeOutput = path.relative(root, absoluteOutput)
  if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) throw new Error('Output must stay inside the repository')
  await fs.mkdir(path.dirname(absoluteOutput), { recursive: true })
  await fs.writeFile(absoluteOutput, report, 'utf8')
  process.stdout.write(`Wrote ${relative(absoluteOutput)} (${important.length} source files, ${routeFiles.length} API routes)\n`)
} else {
  process.stdout.write(report)
}

```

### src/app/admin/layout.tsx

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, LayoutDashboard, Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Quản trị Shop Bé Băng', robots: { index: false, follow: false } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f7f8fb] text-slate-900"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-3 px-4 lg:px-7"><span className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500 text-white"><GraduationCap size={22} /></span><div><p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">Shop Bé Băng</p><h1 className="font-black">Admin</h1></div></div></header><div className="mx-auto lg:grid lg:max-w-[1500px] lg:grid-cols-[16rem_1fr]"><aside className="border-b border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-5rem)] lg:border-b-0 lg:border-r"><nav className="flex gap-2 lg:flex-col"><Link href="/game/admin/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><LayoutDashboard size={18} />Dashboard</Link><Link href="/admin/users" className="flex items-center gap-3 rounded-xl bg-pink-50 px-4 py-3 text-sm font-bold text-pink-700"><Users size={18} />Users</Link></nav></aside><main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main></div></div>
}

```

### src/app/admin/page.tsx

```tsx
import { redirect } from 'next/navigation'
export default function AdminPage() { redirect('/admin/users') }

```

### src/app/admin/users/page.tsx

```tsx
import { getUsers } from '@/lib/users/user.service'
import UserManager from './UserManager'

export const dynamic = 'force-dynamic'
export default async function UsersPage() { return <UserManager initialUsers={await getUsers()} /> }

```

### src/app/admin/users/UserManager.tsx

```tsx
'use client'

import { FormEvent, useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronRight, Gamepad2, Pencil, Plus, Search, UserRound, X } from 'lucide-react'
import type { CreateUserInput, UpdateUserInput, User, UserStatus } from '@/lib/users/user.types'

const statusMap: Record<UserStatus, { label: string; style: string }> = { active: { label: 'Hoạt động', style: 'bg-emerald-50 text-emerald-700' }, inactive: { label: 'Ngừng hoạt động', style: 'bg-slate-100 text-slate-600' }, blocked: { label: 'Đã khóa', style: 'bg-rose-50 text-rose-700' } }
const dateText = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—'
const statusBadge = (status: UserStatus) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusMap[status].style}`}>{statusMap[status].label}</span>
const gameBadge = (active: boolean) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>Game: {active ? 'Bật' : 'Tắt'}</span>

type FormState = { name: string; email: string; phone: string; avatar: string; grade: string; activeGame: boolean; status: UserStatus }
const blankForm: FormState = { name: '', email: '', phone: '', avatar: '', grade: '', activeGame: true, status: 'active' }

export default function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [mode, setMode] = useState<'create' | 'view' | 'edit' | null>(null)
  const [form, setForm] = useState<FormState>(blankForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const visible = useMemo(() => { const value = query.trim().toLowerCase(); return users.filter(user => !value || [user.name, user.email, user.phone, user.userId].some(item => item?.toLowerCase().includes(value))) }, [query, users])

  const openCreate = () => { setForm(blankForm); setSelected(null); setMessage(null); setMode('create') }
  const openView = (user: User) => { setSelected(user); setMessage(null); setMode('view') }
  const openEdit = (user: User) => { setSelected(user); setForm({ name: user.name, email: user.email ?? '', phone: user.phone ?? '', avatar: user.avatar ?? '', grade: user.grade?.toString() ?? '', activeGame: user.activeGame, status: user.status }); setMessage(null); setMode('edit') }
  const close = () => { if (!busy) setMode(null) }
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null)
    const base: CreateUserInput = { name: form.name, email: form.email || null, phone: form.phone || null, avatar: form.avatar || null, grade: form.grade ? Number(form.grade) : null, activeGame: form.activeGame }
    const editing = mode === 'edit' && selected
    const body: CreateUserInput | UpdateUserInput = editing ? { ...base, status: form.status } : base
    const response = await fetch(editing ? `/api/admin/users/${selected.userId}` : '/api/admin/users', { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json() as { user?: User; message?: string }
    setBusy(false)
    if (!response.ok || !result.user) { setMessage(result.message ?? 'Có lỗi xảy ra.'); return }
    setUsers(current => editing ? current.map(user => user.userId === result.user?.userId ? result.user : user) : [result.user as User, ...current])
    setSelected(result.user); setMode('view'); setMessage(editing ? 'Đã cập nhật user.' : 'Đã tạo user thành công.')
  }

  return <div className="mx-auto max-w-7xl"><div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><AlertTriangle className="mr-2 inline" size={17} /><b>Chưa có xác thực admin.</b> Cần bảo vệ route này trước khi deploy production.</div><div className="my-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">Quản trị hệ thống</p><h2 className="mt-1 text-3xl font-black">Quản lý user</h2><p className="mt-1 text-sm text-slate-500">{users.length} người dùng dùng chung trên toàn hệ thống</p></div><button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-pink-600"><Plus size={18} />Thêm user</button></div><div className="rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><label className="flex max-w-lg items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><Search size={18} className="text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="w-full text-sm outline-none" placeholder="Tìm theo tên / email / số điện thoại..." /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['User', 'Email / Phone', 'Lớp', 'Game', 'Status', 'Ngày tạo', 'Action'].map(item => <th key={item} className="px-5 py-4">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map(user => <tr key={user.userId} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-pink-50 font-black text-pink-600">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}</span><div><b className="block">{user.name}</b><span className="text-xs text-slate-400">{user.userId}</span></div></div></td><td className="px-5 py-4 text-slate-600"><span className="block">{user.email ?? '—'}</span><span className="block">{user.phone ?? '—'}</span></td><td className="px-5 py-4">{user.grade ? `Lớp ${user.grade}` : '—'}</td><td className="px-5 py-4">{gameBadge(user.activeGame)}</td><td className="px-5 py-4">{statusBadge(user.status)}</td><td className="px-5 py-4 text-slate-500">{dateText(user.createdAt)}</td><td className="px-5 py-4"><button onClick={() => openView(user)} className="flex items-center gap-1 font-bold text-pink-600">Xem <ChevronRight size={15} /></button></td></tr>)}</tbody></table>{!visible.length && <div className="px-5 py-14 text-center text-sm text-slate-500">{users.length ? 'Không tìm thấy user phù hợp.' : 'Chưa có user. Hãy tạo user đầu tiên.'}</div>}</div></div>{mode && <><button onClick={close} aria-label="Đóng" className="fixed inset-0 z-40 bg-slate-900/30" /><aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black">{mode === 'create' ? 'Thêm user' : mode === 'edit' ? 'Chỉnh sửa user' : 'Chi tiết user'}</h3><button onClick={close} className="rounded-lg p-2 hover:bg-slate-100"><X /></button></div>{message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><Check className="mr-2 inline" size={16} />{message}</p>}{mode === 'view' && selected ? <UserDetail user={selected} onEdit={() => openEdit(selected)} /> : <UserForm form={form} editing={mode === 'edit'} busy={busy} error={message} set={set} onSubmit={submit} onCancel={close} />}</aside></>}</div>
}

function UserDetail({ user, onEdit }: { user: User; onEdit: () => void }) { const rows = [['User ID', user.userId], ['Lớp', user.grade ? `Lớp ${user.grade}` : '—'], ['Email', user.email ?? '—'], ['Điện thoại', user.phone ?? '—'], ['Role', user.role === 'customer' ? 'Customer' : user.role], ['Ngày tạo', dateText(user.createdAt)], ['Cập nhật', dateText(user.updatedAt)], ['Đăng nhập cuối', user.lastLoginAt ? dateText(user.lastLoginAt) : 'Chưa đăng nhập']]; return <div className="mt-7"><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-pink-50 text-2xl font-black text-pink-600"><UserRound /></span><div><h4 className="text-2xl font-black">{user.name}</h4><div className="mt-2 flex gap-2">{statusBadge(user.status)}{gameBadge(user.activeGame)}</div></div></div><dl className="mt-7 divide-y divide-slate-100">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-3"><dt className="text-sm text-slate-500">{label}</dt><dd className="break-all text-sm font-semibold">{value}</dd></div>)}</dl><button onClick={onEdit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-3 font-bold text-white"><Pencil size={17} />Chỉnh sửa</button></div> }

function UserForm({ form, editing, busy, error, set, onSubmit, onCancel }: { form: FormState; editing: boolean; busy: boolean; error: string | null; set: <K extends keyof FormState>(key: K, value: FormState[K]) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) { return <form onSubmit={onSubmit} className="mt-7 space-y-4">{error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}<Field label="Tên *"><input required value={form.name} onChange={event => set('name', event.target.value)} className="input" /></Field><Field label="Email"><input type="email" value={form.email} onChange={event => set('email', event.target.value)} className="input" /></Field><Field label="Số điện thoại"><input value={form.phone} onChange={event => set('phone', event.target.value)} className="input" /></Field><Field label="Avatar URL"><input type="url" value={form.avatar} onChange={event => set('avatar', event.target.value)} className="input" /></Field><Field label="Lớp"><select value={form.grade} onChange={event => set('grade', event.target.value)} className="input"><option value="">Chưa chọn</option>{[1, 2, 3, 4, 5].map(grade => <option key={grade} value={grade}>Lớp {grade}</option>)}</select></Field>{editing && <Field label="Trạng thái"><select value={form.status} onChange={event => set('status', event.target.value as UserStatus)} className="input"><option value="active">Hoạt động</option><option value="inactive">Ngừng hoạt động</option><option value="blocked">Đã khóa</option></select></Field>}<label className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"><span><b className="block text-sm">Quyền chơi game</b><span className="text-xs text-slate-500">Cho phép user sử dụng hệ thống game</span></span><input type="checkbox" checked={form.activeGame} onChange={event => set('activeGame', event.target.checked)} className="h-5 w-5 accent-pink-500" /></label><div className="flex gap-3 pt-3"><button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-bold">Hủy</button><button disabled={busy} className="flex-1 rounded-xl bg-pink-500 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo user'}</button></div></form> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label> }

```

### src/app/api/admin/users/[userId]/route.ts

```ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getUserById, updateUser } from '@/lib/users/user.service'

export const runtime = 'nodejs'
// TODO(auth): protect this route before production. The project currently has no admin authentication.

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  const user = await getUserById(params.userId)
  return user ? NextResponse.json({ user }) : NextResponse.json({ message: 'Không tìm thấy user.' }, { status: 404 })
}
export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  try { const user = await updateUser(params.userId, await request.json()); return user ? NextResponse.json({ user }) : NextResponse.json({ message: 'Không tìm thấy user.' }, { status: 404 }) }
  catch (error) { return NextResponse.json({ message: error instanceof ZodError ? error.issues[0]?.message : 'Không thể cập nhật user.' }, { status: 400 }) }
}

```

### src/app/api/admin/users/route.ts

```ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createUser, getUsers } from '@/lib/users/user.service'

export const runtime = 'nodejs'
// TODO(auth): protect this route before production. The project currently has no admin authentication.

export async function GET() { return NextResponse.json({ users: await getUsers() }) }
export async function POST(request: Request) {
  try { return NextResponse.json({ user: await createUser(await request.json()) }, { status: 201 }) }
  catch (error) { return NextResponse.json({ message: error instanceof ZodError ? error.issues[0]?.message : 'Không thể tạo user.' }, { status: 400 }) }
}

```

### src/app/api/game-tracking/progress/route.ts

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { isLessonId } from '@/components/games/general/tracking/lesson-catalog'

export const runtime = 'nodejs'

const querySchema = z.object({
  userId: z.literal('be-bang-test'),
  lessonId: z.string().refine(isLessonId, 'Unknown lessonId'),
})

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Learning progress requires authentication in production.' }, { status: 503 })
  }
  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return NextResponse.json({ message: 'Invalid query.' }, { status: 400 })

  const id = `${parsed.data.userId}_${parsed.data.lessonId}`
  const snapshot = await getAdminDb().collection('shopbebangcom').doc('game').collection('learning_progress').doc(id).get()
  return NextResponse.json(snapshot.exists ? snapshot.data() : { userId: parsed.data.userId, lessonId: parsed.data.lessonId, keys: {}, totalSessions: 0 })
}

```

### src/app/api/game-tracking/sessions/route.ts

```ts
import { NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { GAME_IDS } from '@/components/games/general/tracking/constants'
import { getLessonDefinition, isLearningKeyForLesson, isLessonId } from '@/components/games/general/tracking/lesson-catalog'

export const runtime = 'nodejs'

const resultSchema = z.object({
  learningKey: z.string().min(1).max(100),
  correct: z.boolean(),
  expectedAnswer: z.union([z.string(), z.number()]).optional(),
  selectedAnswer: z.union([z.string(), z.number()]).optional(),
  responseTime: z.number().int().min(0).max(60 * 60 * 1000).optional(),
  attempt: z.number().int().min(1).max(100),
})

const sessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().min(1).max(128),
  lessonId: z.string().refine(isLessonId, 'Unknown lessonId'),
  gameId: z.enum([GAME_IDS.DRAG_DROP, GAME_IDS.GOLD_MINING, GAME_IDS.RACING]),
  score: z.number().int().min(0).max(100000),
  totalQuestions: z.number().int().min(0).max(1000),
  correctCount: z.number().int().min(0).max(1000),
  wrongCount: z.number().int().min(0).max(1000),
  duration: z.number().int().min(0).max(24 * 60 * 60 * 1000),
  startedAt: z.number().int().positive(),
  results: z.array(resultSchema).max(1000),
}).superRefine((session, context) => {
  const lesson = getLessonDefinition(session.lessonId)
  if (!lesson) return
  session.results.forEach((result, index) => {
    if (!isLearningKeyForLesson(session.lessonId, result.learningKey)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['results', index, 'learningKey'], message: `Learning key does not belong to ${session.lessonId}` })
    }
  })
})

type Aggregate = { correct: number; wrong: number; attempts: number; responseTime: number; sessions: number }

export async function POST(request: Request) {
  try {
    // There is no trusted identity until Firebase Auth is added.
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ message: 'Game tracking requires authenticated users in production.' }, { status: 503 })
    }

    const session = sessionSchema.parse(await request.json())
    if (session.userId !== 'be-bang-test') {
      return NextResponse.json({ message: 'Invalid development user.' }, { status: 403 })
    }

    const db = getAdminDb()
    const sessionRef = db.collection('shopbebangcom').doc('game').collection('session').doc(session.sessionId)
    const progressId = `${session.userId}_${session.lessonId}`
    const progressRef = db.collection('shopbebangcom').doc('game').collection('learning_progress').doc(progressId)

    await db.runTransaction(async (transaction) => {
      const existingSession = await transaction.get(sessionRef)
      if (existingSession.exists) return

      const progressSnapshot = await transaction.get(progressRef)
      const existingKeys = (progressSnapshot.data()?.keys ?? {}) as Record<string, Partial<Aggregate>>
      const sessionKeys = new Set<string>(session.results.map((result) => result.learningKey))
      const increments = new Map<string, Aggregate>()

      for (const result of session.results) {
        const current = increments.get(result.learningKey) ?? { correct: 0, wrong: 0, attempts: 0, responseTime: 0, sessions: 0 }
        current.correct += result.correct ? 1 : 0
        current.wrong += result.correct ? 0 : 1
        current.attempts += 1
        current.responseTime += result.responseTime ?? 0
        increments.set(result.learningKey, current)
      }

      const keys = { ...existingKeys }
      for (const [learningKey, increment] of Array.from(increments.entries())) {
        const current = existingKeys[learningKey] ?? {}
        keys[learningKey] = {
          correct: (current.correct ?? 0) + increment.correct,
          wrong: (current.wrong ?? 0) + increment.wrong,
          attempts: (current.attempts ?? 0) + increment.attempts,
          responseTime: (current.responseTime ?? 0) + increment.responseTime,
          sessions: (current.sessions ?? 0) + (sessionKeys.has(learningKey) ? 1 : 0),
        }
      }

      transaction.create(sessionRef, {
        ...session,
        startedAt: Timestamp.fromMillis(session.startedAt),
        completedAt: FieldValue.serverTimestamp(),
      })
      transaction.set(progressRef, {
        userId: session.userId,
        lessonId: session.lessonId,
        keys,
        totalSessions: (progressSnapshot.data()?.totalSessions ?? 0) + 1,
        updatedAt: FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ sessionId: session.sessionId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid game session.', issues: error.issues }, { status: 400 })
    }
    console.error('[GameTracking] Session API failed', error)
    return NextResponse.json({ message: 'Could not save game session.' }, { status: 500 })
  }
}

```

### src/app/api/mktonline-orders/route.ts

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

const OrderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(8).max(20),
  address: z.string().trim().min(1).max(200),

  // NEW
  orangeType: z.enum(['type1', 'type2']).default('type1'),

  packageKey: z.enum(['5kg', '10kg', '20kg', 'other']),
  otherKg: z.string().trim().max(10).optional().default(''),

  time: z.string().trim().max(60).optional().default(''),
  note: z.string().trim().max(500).optional().default(''),
  payment: z.enum(['cod', 'bank']),

  hp: z.string().optional(), // honeypot
})

const PRICE_PER_KG: Record<'type1' | 'type2', number> = {
  type1: 36000,
  type2: 27000,
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
}

function parseKg(packageKey: string, otherKgRaw: string) {
  if (packageKey === '5kg') return 5
  if (packageKey === '10kg') return 10
  if (packageKey === '20kg') return 20

  // other
  const kgStr = (otherKgRaw || '').trim()
  if (!kgStr) throw new Error('Vui lòng nhập số kg muốn đặt.')
  if (!/^\d+(\.\d+)?$/.test(kgStr)) throw new Error('Số kg không hợp lệ.')

  const kg = Number(kgStr)
  if (!Number.isFinite(kg) || kg <= 0) throw new Error('Số kg không hợp lệ.')
  if (kg > 200) throw new Error('Số kg quá lớn.') // chặn cực đoan (tùy bạn)

  return kg
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = OrderSchema.parse(body)

    // honeypot
    if (parsed.hp && parsed.hp.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const unitPrice = PRICE_PER_KG[parsed.orangeType]
    const kg = parseKg(parsed.packageKey, parsed.otherKg)
    const totalPrice = Math.round(kg * unitPrice)

    const db = getAdminDb()

    // camhuucovn/mktonline/orders/{orderId}
    const colRef = db.collection('camhuucovn').doc('mktonline').collection('orders')
    const docRef = colRef.doc()

    await docRef.set({
      name: parsed.name,
      phone: normalizePhone(parsed.phone),
      address: parsed.address,

      orangeType: parsed.orangeType,
      unitPrice,
      kg,
      totalPrice,

      packageKey: parsed.packageKey,
      otherKg: parsed.otherKg || '',

      time: parsed.time || '',
      note: parsed.note || '',
      payment: parsed.payment,

      status: 'new',
      source: 'web',

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ ok: true, id: docRef.id }, { status: 200 })
  } catch (err: any) {
    // lỗi validate từ zod
    if (err?.issues) {
      return NextResponse.json(
        { ok: false, message: 'Dữ liệu chưa hợp lệ.', issues: err.issues },
        { status: 400 }
      )
    }

    // lỗi “parseKg” mình throw Error(message)
    const msg = err?.message || 'Server error'
    const status =
      msg.includes('kg') || msg.includes('Số kg') || msg.includes('Vui lòng') ? 400 : 500

    return NextResponse.json({ ok: false, message: msg }, { status })
  }
}

```

### src/app/blog/[slug]/page.tsx

```tsx
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { POSTS } from '../posts'
import { POST_COMPONENTS } from '../post-registry'

type Props = { params: { slug: string } }

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const post = POSTS.find((p) => p.slug === params.slug)
  if (!post) return {}

  const canonical = `https://camhuuco.vn/blog/${post.slug}`

  return {
    title: `${post.title} | Cam Hữu Cơ`,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: canonical,
      type: 'article',
      images: [post.hero || post.thumbnail],
    },
  }
}

function ArticleJsonLd({
  slug,
  title,
  excerpt,
  date,
  image,
}: {
  slug: string
  title: string
  excerpt: string
  date: string
  image: string
}) {
  const canonical = `https://camhuuco.vn/blog/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    image: [`https://camhuuco.vn${image}`],
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Organization', name: 'Cam Hữu Cơ' },
    publisher: { '@type': 'Organization', name: 'Cam Hữu Cơ' },
    mainEntityOfPage: canonical,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default function BlogSlugPage({ params }: Props) {
  const post = POSTS.find((p) => p.slug === params.slug)
  if (!post) return notFound()

  const hero = post.hero || post.thumbnail
  const Render = POST_COMPONENTS[post.id]

  return (
    <article className="prose prose-gray max-w-none">
      <ArticleJsonLd
        slug={post.slug}
        title={post.title}
        excerpt={post.excerpt}
        date={post.date}
        image={hero}
      />

      <header className="not-prose">
        <p className="text-orange-600 font-semibold">{post.tag || 'Blog'}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">{post.title}</h1>
        <div className="mt-3 text-sm text-gray-500">Cập nhật: {post.date}</div>
        <p className="mt-3 text-gray-600">{post.excerpt}</p>

        <div className="mt-6 relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
          <Image src={hero} alt={post.title} fill className="object-cover" priority />
        </div>
      </header>

      {Render ? <Render /> : <p>Nội dung đang cập nhật.</p>}
    </article>
  )
}

```

### src/app/blog/page.tsx

```tsx
import { redirect } from 'next/navigation'

export default function BlogIndexRedirect() {
  redirect('/blogs')
}

```

### src/app/game/admin/AdminShell.tsx

```tsx
'use client'

import { usePathname } from 'next/navigation'

export default function AdminShell({ dashboard, legacy }: { dashboard: React.ReactNode; legacy: React.ReactNode }) {
  const pathname = usePathname()
  return pathname === '/game/admin/dashboard' ? dashboard : legacy
}

```

### src/app/game/admin/danh-gia/page.tsx

```tsx
import Link from 'next/link'
import { getAdminLearningProgress } from '@/lib/gameTrackingAdmin'
import { getLessonDefinition, LESSON_CATALOG, type LessonId } from '@/components/games/general/tracking/lesson-catalog'

const accuracy = (correct: number, attempts: number) => attempts ? Math.round(correct / attempts * 100) : 0

export default async function EvaluationPage({ searchParams }: { searchParams?: { userId?: string; lessonId?: string } }) {
  const allProgress = await getAdminLearningProgress()
  const requestedLesson = searchParams?.lessonId ? getLessonDefinition(searchParams.lessonId) : undefined
  const lesson = requestedLesson ?? LESSON_CATALOG[Object.keys(LESSON_CATALOG)[0] as LessonId]
  const lessonProgress = allProgress.filter((item) => item.lessonId === lesson.lessonId)
  const selectedUserId = searchParams?.userId || lessonProgress[0]?.userId
  const selected = lessonProgress.find((item) => item.userId === selectedUserId)

  return <div className="space-y-6">
    <div><p className="text-sm font-bold text-blue-600">{lesson.gradeLabel} / {lesson.subjectLabel}</p><h2 className="text-2xl font-black">Bài {lesson.lessonNumber} · {lesson.title}</h2><p className="mt-1 text-sm text-slate-500">100% nghĩa là chưa có lần trả lời sai; “còn yếu” hiện được hiển thị khi độ chính xác dưới 70%.</p></div>
    <div className="flex flex-wrap gap-2">{Object.values(LESSON_CATALOG).map((item) => <Link key={item.lessonId} href={`/game/admin/danh-gia?lessonId=${item.lessonId}`} className={`rounded-xl px-4 py-2 text-sm font-bold ${item.lessonId === lesson.lessonId ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Bài {item.lessonNumber}</Link>)}</div>
    <div className="flex flex-wrap gap-2">{lessonProgress.map((item) => <Link key={item.id} href={`/game/admin/danh-gia?lessonId=${lesson.lessonId}&userId=${encodeURIComponent(item.userId)}`} className={`rounded-xl px-4 py-2 text-sm font-bold ${item.userId === selectedUserId ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{item.userId}</Link>)}</div>
    {!selected ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Chưa có dữ liệu tiến độ cho Bài {lesson.lessonNumber} · {lesson.title}.</div> : <>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Người học</p><p className="mt-1 text-xl font-black">{selected.userId}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Tổng phiên</p><p className="mt-1 text-xl font-black">{selected.totalSessions}</p></div><div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Cập nhật</p><p className="mt-1 text-sm font-bold">{selected.updatedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(selected.updatedAt)) : '—'}</p></div></section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lesson.learningGoals.map((goal) => {
        const progress = selected.keys[goal.key] ?? { correct: 0, wrong: 0, attempts: 0, responseTime: 0, sessions: 0 }
        const value = accuracy(progress.correct, progress.attempts)
        const status = !progress.attempts ? 'Chưa có dữ liệu' : value === 100 ? 'Đạt 100%' : value < 70 ? 'Còn yếu' : 'Đang tiến bộ'
        const color = !progress.attempts ? 'bg-slate-400' : value === 100 ? 'bg-emerald-500' : value < 70 ? 'bg-red-500' : 'bg-amber-500'
        return <article key={goal.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{goal.title}</h3><p className="mt-1 text-xs text-slate-400">{goal.key}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${color}`}>{status}</span></div><p className="mt-5 text-4xl font-black text-slate-900">{value}%</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div><dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div><dt className="text-slate-400">Đúng</dt><dd className="font-black text-emerald-600">{progress.correct}</dd></div><div><dt className="text-slate-400">Sai</dt><dd className="font-black text-red-600">{progress.wrong}</dd></div><div><dt className="text-slate-400">Số lần</dt><dd className="font-black">{progress.attempts}</dd></div></dl></article>
      })}</section>
    </>}
  </div>
}

```

### src/app/game/admin/dashboard/_components/Dashboard.tsx

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { createDashboardService, dashboardService } from '../_data/dashboard.service'
import type {
  GameEvidence,
  LearningStatus,
  Lesson,
  Objective,
  Student,
  StudentOverview,
  StudentRecord,
  SubjectSummary,
} from '../_data/types'

const statusConfig: Record<LearningStatus, { label: string; className: string }> = {
  mastered: { label: 'Đã đạt', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  practicing: { label: 'Đang luyện', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  needs_practice: { label: 'Cần luyện thêm', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  no_data: { label: 'Chưa có dữ liệu', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

function StatusBadge({ status }: { status: LearningStatus }) {
  const item = statusConfig[status]
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  )
}
function ProgressBar({
  value,
  tone = 'pink',
}: {
  value: number
  tone?: 'pink' | 'blue' | 'green'
}) {
  const colors = { pink: 'bg-pink-500', blue: 'bg-sky-500', green: 'bg-emerald-500' }
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${colors[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
function EmptyState({
  title = 'Chưa có dữ liệu',
  detail = 'Dữ liệu học tập sẽ xuất hiện sau khi bé bắt đầu luyện tập.',
}: {
  title?: string
  detail?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <BookOpen className="mx-auto mb-3 text-slate-300" size={34} />
      <p className="font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  )
}

function Selector({
  label,
  value,
  children,
  onChange,
}: {
  label: string
  value: string | number
  children: React.ReactNode
  onChange: (value: string) => void
}) {
  return (
    <label className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="hidden text-slate-500 sm:inline">{label}:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none bg-transparent pr-6 font-bold text-slate-800 outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 text-slate-400" size={15} />
    </label>
  )
}

function Header({
  studentId,
  grade,
  onStudent,
  onGrade,
  onMenu,
}: {
  studentId: string
  grade: number
  onStudent: (id: string) => void
  onGrade: (grade: number) => void
  onMenu: () => void
}) {
  const students = dashboardService.getStudents()
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-3 px-4 lg:px-7">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="rounded-lg p-2 text-slate-600 lg:hidden"
            aria-label="Mở menu"
          >
            <Menu />
          </button>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-500 text-white shadow-sm">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">
              Shop Bé Băng
            </p>
            <h1 className="hidden text-lg font-black text-slate-900 sm:block">
              Learning Dashboard
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden text-right xl:block">
            <p className="text-xs text-slate-400">Cập nhật gần nhất</p>
            <p className="text-sm font-semibold text-slate-700">Hôm nay · 20:35</p>
          </div>
          <Selector label="Bé" value={studentId} onChange={onStudent}>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </Selector>
          <Selector label="Lớp" value={grade} onChange={(value) => onGrade(Number(value))}>
            {[1, 2, 3, 4, 5].map((item) => (
              <option key={item} value={item}>
                Lớp {item}
              </option>
            ))}
          </Selector>
        </div>
      </div>
    </header>
  )
}

function Sidebar({
  open,
  subjectId,
  summaries,
  onClose,
  onOverview,
  onSubject,
  onHistory,
}: {
  open: boolean
  subjectId: string | null
  summaries: SubjectSummary[]
  onClose: () => void
  onOverview: () => void
  onSubject: (id: string) => void
  onHistory: () => void
}) {
  return (
    <>
      <button
        aria-label="Đóng menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/30 lg:hidden ${open ? 'block' : 'hidden'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-5 transition-transform lg:sticky lg:top-20 lg:z-20 lg:h-[calc(100vh-5rem)] lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="font-black">Điều hướng</p>
          <button onClick={onClose} className="p-2">
            <X size={20} />
          </button>
        </div>
        <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[.16em] text-slate-400">
          Tổng quan
        </p>
        <button
          onClick={onOverview}
          className={`mb-6 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${subjectId === null ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <LayoutDashboard size={18} />
          Tổng quan
        </button>
        <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[.16em] text-slate-400">
          Môn học
        </p>
        <div className="space-y-2">
          {summaries.map(({ subject, progress }) => (
            <button
              key={subject.id}
              onClick={() => onSubject(subject.id)}
              className={`w-full rounded-xl px-3 py-3 text-left ${subjectId === subject.id ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50'}`}
            >
              <span className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span className="flex items-center gap-3">
                  <BookOpen size={18} className="text-sky-600" />
                  {subject.name}
                </span>
                <span>{progress}%</span>
              </span>
              <div className="mt-2">
                <ProgressBar value={progress} tone="blue" />
              </div>
              <span className="mt-1 block text-[11px] text-slate-400">{progress}% hoàn thành</span>
            </button>
          ))}
        </div>
        <p className="mb-2 mt-7 px-3 text-[11px] font-black uppercase tracking-[.16em] text-slate-400">
          Khác
        </p>
        <button
          onClick={onHistory}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${subjectId === 'history' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Clock3 size={18} />
          Lịch sử chơi
        </button>
        <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <TrendingUp size={18} />
          Tiến bộ
        </button>
        <Link href="/admin/users" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <Users size={18} />
          Users
        </Link>
      </aside>
    </>
  )
}

function Breadcrumb({
  studentName,
  grade,
  subjectName,
  lesson,
  onHome,
  onSubject,
}: {
  studentName: string
  grade: number
  subjectName?: string
  lesson?: Lesson
  onHome: () => void
  onSubject: () => void
}) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
      <button onClick={onHome} className="font-semibold hover:text-pink-600">
        {studentName}
      </button>
      <ChevronRight size={14} />
      <button onClick={onHome} className="hover:text-pink-600">
        Lớp {grade}
      </button>
      {subjectName && (
        <>
          <ChevronRight size={14} />
          <button onClick={onSubject} className="hover:text-pink-600">
            {subjectName}
          </button>
        </>
      )}
      {lesson && (
        <>
          <ChevronRight size={14} />
          <span className="font-semibold text-slate-800">Bài {lesson.order}</span>
        </>
      )}
    </nav>
  )
}

function Overview({ data, onSubject }: { data: StudentOverview; onSubject: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">
                Tiến độ học tập
              </p>
              <p className="mt-3 text-5xl font-black text-slate-900">{data.progress}%</p>
              <p className="mt-2 text-sm text-slate-500">
                <b className="text-slate-800">
                  {data.masteredObjectives}/{data.totalObjectives}
                </b>{' '}
                mục tiêu đã đạt
              </p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-pink-500">
              <Target />
            </span>
          </div>
          <div className="mt-7">
            <ProgressBar value={data.progress} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {data.subjects.map((item) => (
            <button
              key={item.subject.id}
              onClick={() => onSubject(item.subject.id)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200"
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800">{item.subject.name}</span>
                <span className="text-xl font-black text-sky-600">{item.progress}%</span>
              </div>
              <div className="mt-4">
                <ProgressBar value={item.progress} tone="blue" />
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <ObjectiveList
          title="Cần chú ý"
          icon={<Target size={19} />}
          items={data.attention}
          empty="Chưa có mục tiêu cần chú ý"
        />
        <ObjectiveList
          title="Đang làm tốt"
          icon={<Award size={19} />}
          items={data.strong}
          empty="Chưa có mục tiêu đã đạt"
        />
      </section>
      <RecentActivities data={data} />
    </div>
  )
}

function ObjectiveList({
  title,
  icon,
  items,
  empty,
}: {
  title: string
  icon: React.ReactNode
  items: StudentOverview['attention']
  empty: string
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-black text-slate-900">
        {icon}
        {title}
      </h2>
      {items.length ? (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.subject.name} · Bài {item.lesson.order}
                  </p>
                </div>
                <b className="text-lg text-slate-800">{item.score}%</b>
              </div>
              <div className="mt-2">
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">{empty}</p>
      )}
    </section>
  )
}

function RecentActivities({ data }: { data: StudentOverview }) {
  const games = dashboardService.getGames()
  const subjects = dashboardService.getSubjects()
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-black">
        <Activity size={19} />
        Hoạt động gần đây
      </h2>
      {data.recentActivities.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentActivities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-pink-500">
                  <Gamepad2 size={18} />
                </span>
                <b className="text-lg">{activity.score}%</b>
              </div>
              <p className="mt-3 font-bold">
                {games.find((game) => game.id === activity.gameId)?.name}
              </p>
              <p className="text-xs text-slate-500">
                {subjects.find((subject) => subject.id === activity.subjectId)?.name} ·{' '}
                {activity.correct}/{activity.total} câu đúng
              </p>
              <p className="mt-2 text-xs text-slate-400">{activity.when}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </section>
  )
}

function SubjectView({
  summary,
  lessons,
  onLesson,
}: {
  summary: SubjectSummary
  lessons: Lesson[]
  onLesson: (lesson: Lesson) => void
}) {
  const [query, setQuery] = useState('')
  const visible = lessons.filter((lesson) =>
    lesson.title.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [summary.total, 'Mục tiêu'],
            [summary.mastered, 'Đã đạt'],
            [summary.practicing, 'Đang luyện'],
            [summary.noData, 'Chưa học'],
          ].map(([value, label]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-3xl font-black">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex justify-between">
            <b>Tiến độ môn học</b>
            <b className="text-sky-600">{summary.progress}%</b>
          </div>
          <ProgressBar value={summary.progress} tone="blue" />
        </div>
      </section>
      <section>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="font-black uppercase tracking-wide text-slate-800">Danh sách bài học</h2>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm bài học..."
              className="w-48 outline-none"
            />
          </label>
        </div>
        {visible.length ? (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} onClick={() => onLesson(lesson)} />
            ))}
          </div>
        ) : (
          <EmptyState title="Không tìm thấy bài học" detail="Thử một từ khóa khác." />
        )}
      </section>
    </div>
  )
}

function LessonCard({ lesson, onClick }: { lesson: Lesson; onClick: () => void }) {
  const mastered = lesson.objectives.filter((item) => item.status === 'mastered').length
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-black uppercase tracking-[.16em] text-pink-500">
          Bài {lesson.order}
        </span>
        <ChevronRight className="text-slate-300 group-hover:text-pink-500" />
      </div>
      <h3 className="mt-3 text-lg font-black text-slate-900">{lesson.title}</h3>
      <p className="mt-7 text-sm text-slate-500">
        {mastered}/{lesson.objectives.length} mục tiêu đã đạt
      </p>
      <div className="mt-3">
        <ProgressBar value={lesson.progress} tone={lesson.progress >= 85 ? 'green' : 'pink'} />
      </div>
      <p className="mt-2 text-right text-sm font-bold">{lesson.progress}%</p>
    </button>
  )
}

function GameEvidenceList({ items }: { items: GameEvidence[] }) {
  const gameCatalog = dashboardService.getGames()
  if (!items.length)
    return <p className="text-sm text-slate-400">Chưa có game cung cấp evidence.</p>
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.gameId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex justify-between">
            <p className="font-bold">
              {gameCatalog.find((game) => game.id === item.gameId)?.name ?? item.gameId}
            </p>
            <b>{item.accuracy}%</b>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {item.attempts} lượt chơi · {item.correct}/{item.total} câu đúng
          </p>
          <div className="mt-3">
            <ProgressBar value={item.accuracy} tone="blue" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-pink-500">
            Mục tiêu học tập
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{objective.title}</h3>
          <div className="mt-3">
            <StatusBadge status={objective.status} />
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-4xl font-black">{objective.score}%</p>
          <p className="text-xs text-slate-400">Điểm tổng hợp</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="mb-3 text-sm font-bold text-slate-700">Game cung cấp dữ liệu đánh giá</p>
        <GameEvidenceList items={objective.games} />
      </div>
      {objective.games.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
          <div>
            <b className="block text-base text-slate-800">{objective.games.at(-1)?.latestScore}%</b>
            Gần nhất
          </div>
          <div>
            <b className="block text-base text-slate-800">
              {Math.max(...objective.games.map((item) => item.bestScore))}%
            </b>
            Tốt nhất
          </div>
          <div>
            <b className="block text-base text-emerald-600">{objective.trend}</b>Xu hướng
          </div>
        </div>
      )}
      <button
        onClick={() => setExpanded((value) => !value)}
        className="mt-5 flex items-center gap-2 text-sm font-bold text-pink-600 hover:text-pink-700"
      >
        {expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết skill key'}
        <ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
      </button>
      {expanded && <SkillGrid objective={objective} />}
    </article>
  )
}

function SkillGrid({ objective }: { objective: Objective }) {
  const entries = Object.entries(objective.skillPerformance)
  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500" />
        <p className="font-bold">Hiệu quả theo từng skill key</p>
      </div>
      {entries.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {entries.map(([key, value]) => {
            const status: LearningStatus =
              value.accuracy >= 80
                ? 'mastered'
                : value.accuracy >= 70
                  ? 'practicing'
                  : 'needs_practice'
            return (
              <div
                key={key}
                className={`rounded-2xl p-4 text-center ring-1 ring-inset ${statusConfig[status].className}`}
              >
                <p className="text-xs font-bold uppercase opacity-70">
                  {key.replace('number-', 'Số ')}
                </p>
                <p className="my-2 text-2xl font-black">{value.accuracy}%</p>
                <p className="text-[11px] font-bold">{statusConfig[status].label}</p>
                <p className="mt-2 text-[10px] opacity-60">
                  {value.correct}/{value.attempts} câu đúng
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function LessonView({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const mastered = lesson.objectives.filter((item) => item.status === 'mastered').length
  const practicing = lesson.objectives.filter(
    (item) => item.status === 'practicing' || item.status === 'needs_practice'
  ).length
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-pink-600"
      >
        <ArrowLeft size={17} />
        Quay lại danh sách bài
      </button>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[.17em] text-pink-500">
          Bài {lesson.order}
        </p>
        <h2 className="mt-2 text-3xl font-black">{lesson.title}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <b>Tiến độ bài học</b>
              <b>{lesson.progress}%</b>
            </div>
            <ProgressBar value={lesson.progress} />
          </div>
          <div className="flex gap-4 text-sm text-slate-500">
            <span>
              <b className="text-slate-800">{lesson.objectives.length}</b> mục tiêu
            </span>
            <span>
              <b className="text-emerald-600">{mastered}</b> đạt
            </span>
            <span>
              <b className="text-amber-600">{practicing}</b> đang luyện
            </span>
          </div>
        </div>
      </section>
      <div className="space-y-4">
        {lesson.objectives.map((objective) => (
          <ObjectiveCard key={objective.id} objective={objective} />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({
  initialStudents,
  initialRecords,
}: {
  initialStudents: Student[]
  initialRecords: StudentRecord[]
}) {
  const service = useMemo(
    () => createDashboardService(initialRecords, initialStudents),
    [initialRecords, initialStudents]
  )
  const students = service.getStudents()
  const [studentId, setStudentId] = useState(students[0].id)
  const [grade, setGrade] = useState(students[0].currentGrade)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const student = students.find((item) => item.id === studentId) ?? students[0]
  const overview = useMemo(
    () => service.getStudentOverview(studentId, grade),
    [service, studentId, grade]
  )
  const subjectSummary =
    subjectId && subjectId !== 'history'
      ? service.getSubjectProgress(studentId, grade, subjectId)
      : null
  const lessons = subjectSummary
    ? service.getLessons(studentId, grade, subjectSummary.subject.id)
    : []
  const lesson = lessons.find((item) => item.id === lessonId)
  const chooseStudent = (id: string) => {
    const next = students.find((item) => item.id === id)
    setStudentId(id)
    setGrade(next?.currentGrade ?? 1)
    setSubjectId(null)
    setLessonId(null)
  }
  const chooseSubject = (id: string) => {
    setSubjectId(id)
    setLessonId(null)
    setMenuOpen(false)
  }
  const showOverview = () => {
    setSubjectId(null)
    setLessonId(null)
    setMenuOpen(false)
  }
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <Header
        studentId={studentId}
        grade={grade}
        onStudent={chooseStudent}
        onGrade={(value) => {
          setGrade(value)
          setSubjectId(null)
          setLessonId(null)
        }}
        onMenu={() => setMenuOpen(true)}
      />
      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        <Sidebar
          open={menuOpen}
          subjectId={subjectId}
          summaries={overview.subjects}
          onClose={() => setMenuOpen(false)}
          onOverview={showOverview}
          onSubject={chooseSubject}
          onHistory={() => chooseSubject('history')}
        />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {subjectId !== 'history' && (
              <Breadcrumb
                studentName={student.name}
                grade={grade}
                subjectName={subjectSummary?.subject.name}
                lesson={lesson}
                onHome={showOverview}
                onSubject={() => setLessonId(null)}
              />
            )}
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">
                {student.name} · Lớp {grade}
              </p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                {subjectId === 'history'
                  ? 'Lịch sử chơi'
                  : lesson
                    ? lesson.title
                    : subjectSummary
                      ? `${subjectSummary.subject.name} · Lớp ${grade}`
                      : 'Tổng quan học tập'}
              </h2>
            </div>
            {subjectId === 'history' ? (
              <RecentActivities data={overview} />
            ) : lesson ? (
              <LessonView lesson={lesson} onBack={() => setLessonId(null)} />
            ) : subjectSummary ? (
              <SubjectView
                summary={subjectSummary}
                lessons={lessons}
                onLesson={(item) => setLessonId(item.id)}
              />
            ) : overview.totalObjectives ? (
              <Overview data={overview} onSubject={chooseSubject} />
            ) : (
              <EmptyState
                title={`Chưa có dữ liệu Lớp ${grade}`}
                detail="Bạn có thể chọn học sinh hoặc khối lớp khác ở phía trên."
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

```

### src/app/game/admin/dashboard/_data/dashboard.mock.ts

```ts
import type { Game, Lesson, Student, StudentRecord, Subject } from './types'

// Chỉ phản ánh catalog hiện có trong source game. Không chứa điểm hoặc hoạt động giả.
export const students: Student[] = [
  { id: 'be-bang-test', name: 'Băng', avatar: 'B', currentGrade: 1 },
]

export const subjects: Subject[] = [{ id: 'math', name: 'Toán' }]

const skillKeys = [
  'recognize-number-0', 'recognize-number-1', 'recognize-number-2',
  'recognize-number-3', 'recognize-number-4', 'recognize-number-5',
]

export const games: Game[] = [
  { id: 'drag-drop', name: 'Drag & Drop', path: '/game/lop-1/toan/bai-1/drag-drop', skillKeys },
  { id: 'gold-mining', name: 'Gold Mining', path: '/game/lop-1/toan/bai-1/gold-mining', skillKeys },
  { id: 'racing', name: 'Racing', path: '/game/lop-1/toan/bai-1/racing', skillKeys },
]

const lessons: Lesson[] = [{
  id: 'toan-1-bai-1',
  order: 1,
  grade: 1,
  subjectId: 'math',
  title: 'Nhận biết số từ 0 đến 5',
  progress: 0,
  objectives: [{
    id: 'recognize-numbers-0-5',
    title: 'Nhận biết số từ 0 đến 5',
    score: 0,
    status: 'no_data',
    trend: 'Chưa có dữ liệu',
    skillPerformance: {},
    games: [],
  }],
}]

export const records: StudentRecord[] = [
  { studentId: 'be-bang-test', grade: 1, lessons, recentActivities: [] },
]

```

### src/app/game/admin/dashboard/_data/dashboard.server.ts

```ts
import 'server-only'

import { getAdminGameSessions, getAdminLearningProgress } from '@/lib/gameTrackingAdmin'
import type { AdminGameSession, AdminKeyProgress } from '@/lib/gameTrackingAdmin'
import type {
  GameEvidence,
  LearningStatus,
  SkillPerformance,
  Student,
  StudentRecord,
} from './types'

const LESSON_ID = 'toan-1-bai-1'
const SKILL_KEYS = Array.from({ length: 6 }, (_, index) => `recognize-number-${index}`)
const accuracyOf = (correct: number, attempts: number) =>
  attempts > 0 ? Math.round((correct / attempts) * 100) : 0
const statusOf = (accuracy: number, attempts: number): LearningStatus =>
  !attempts
    ? 'no_data'
    : accuracy >= 80
      ? 'mastered'
      : accuracy >= 70
        ? 'practicing'
        : 'needs_practice'

function gameEvidence(sessions: AdminGameSession[]): GameEvidence[] {
  const groups = new Map<string, AdminGameSession[]>()
  sessions.forEach((session) =>
    groups.set(session.gameId, [...(groups.get(session.gameId) ?? []), session])
  )
  return Array.from(groups, ([gameId, items]) => {
    const sorted = [...items].sort((a, b) =>
      (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
    )
    const correct = items.reduce((sum, item) => sum + item.correctCount, 0)
    const total = items.reduce((sum, item) => sum + item.totalQuestions, 0)
    return {
      gameId,
      attempts: items.length,
      correct,
      total,
      accuracy: accuracyOf(correct, total),
      bestScore: Math.max(
        ...items.map((item) => accuracyOf(item.correctCount, item.totalQuestions))
      ),
      latestScore: accuracyOf(sorted[0].correctCount, sorted[0].totalQuestions),
    }
  })
}

function skillPerformanceOf(
  keys: Record<string, AdminKeyProgress>
): Record<string, SkillPerformance> {
  return Object.fromEntries(
    SKILL_KEYS.flatMap((key) => {
      const item = keys[key]
      return item?.attempts
        ? [
            [
              key,
              {
                attempts: item.attempts,
                correct: item.correct,
                accuracy: accuracyOf(item.correct, item.attempts),
              },
            ],
          ]
        : []
    })
  )
}

export async function getRealDashboardData(): Promise<{
  students: Student[]
  records: StudentRecord[]
}> {
  const [progressRows, sessions] = await Promise.all([
    getAdminLearningProgress(),
    getAdminGameSessions(100),
  ])
  const userIds = Array.from(
    new Set(
      [...progressRows.map((row) => row.userId), ...sessions.map((row) => row.userId)].filter(
        Boolean
      )
    )
  )
  const students: Student[] = userIds.map((id) => ({
    id,
    name: id === 'be-bang-test' ? 'Băng' : id,
    avatar: id.charAt(0).toUpperCase(),
    currentGrade: 1,
  }))
  if (!students.length)
    students.push({ id: 'be-bang-test', name: 'Băng', avatar: 'B', currentGrade: 1 })

  const records = students.map<StudentRecord>((student) => {
    const progress = progressRows.find(
      (row) => row.userId === student.id && row.lessonId === LESSON_ID
    )
    const lessonSessions = sessions.filter(
      (row) => row.userId === student.id && row.lessonId === LESSON_ID
    )
    const skills = skillPerformanceOf(progress?.keys ?? {})
    const values = Object.values(skills)
    const attempts = values.reduce((sum, item) => sum + item.attempts, 0)
    const correct = values.reduce((sum, item) => sum + item.correct, 0)
    const score = accuracyOf(correct, attempts)
    const status = statusOf(score, attempts)
    return {
      studentId: student.id,
      grade: 1,
      lessons: [
        {
          id: LESSON_ID,
          order: 1,
          grade: 1,
          subjectId: 'math',
          title: 'Nhận biết số từ 0 đến 5',
          progress: score,
          objectives: [
            {
              id: 'recognize-numbers-0-5',
              title: 'Nhận biết số từ 0 đến 5',
              score,
              status,
              trend: status === 'no_data' ? 'Chưa có dữ liệu' : 'Đã ghi nhận',
              skillPerformance: skills,
              games: gameEvidence(lessonSessions),
            },
          ],
        },
      ],
      recentActivities: lessonSessions
        .slice(0, 5)
        .map((session) => ({
          id: session.id,
          gameId: session.gameId,
          subjectId: 'math',
          lessonId: LESSON_ID,
          score: accuracyOf(session.correctCount, session.totalQuestions),
          correct: session.correctCount,
          total: session.totalQuestions,
          when: session.completedAt
            ? new Intl.DateTimeFormat('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
                timeZone: 'Asia/Bangkok',
              }).format(new Date(session.completedAt))
            : 'Vừa hoàn thành',
        })),
    }
  })
  return { students, records }
}

```

### src/app/game/admin/dashboard/_data/dashboard.service.ts

```ts
import {
  games,
  records as fallbackRecords,
  students as fallbackStudents,
  subjects,
} from './dashboard.mock'
import type { Lesson, Student, StudentOverview, StudentRecord, SubjectSummary } from './types'

export const createDashboardService = (
  records: StudentRecord[] = fallbackRecords,
  students: Student[] = fallbackStudents
) => ({
  getStudents: () => students,
  getGames: () => games,
  getSubjects: () => subjects,
  getLessons(studentId: string, grade: number, subjectId: string): Lesson[] {
    return (
      records
        .find((record) => record.studentId === studentId && record.grade === grade)
        ?.lessons.filter((lesson) => lesson.subjectId === subjectId) ?? []
    )
  },
  getLessonPerformance(studentId: string, grade: number, subjectId: string, lessonId: string) {
    return this.getLessons(studentId, grade, subjectId).find((lesson) => lesson.id === lessonId)
  },
  getObjectivePerformance(studentId: string, objectiveId: string) {
    return records
      .find((record) => record.studentId === studentId)
      ?.lessons.flatMap((lesson) => lesson.objectives)
      .find((objective) => objective.id === objectiveId)
  },
  getSubjectProgress(studentId: string, grade: number, subjectId: string): SubjectSummary {
    const lessons = this.getLessons(studentId, grade, subjectId)
    const objectives = lessons.flatMap((lesson) => lesson.objectives)
    const subject = subjects.find((item) => item.id === subjectId) ?? {
      id: subjectId,
      name: subjectId,
    }
    const active = objectives.filter((item) => item.status !== 'no_data')
    return {
      subject,
      progress: active.length
        ? Math.round(active.reduce((sum, item) => sum + item.score, 0) / active.length)
        : 0,
      total: objectives.length,
      mastered: objectives.filter((item) => item.status === 'mastered').length,
      practicing: objectives.filter(
        (item) => item.status === 'practicing' || item.status === 'needs_practice'
      ).length,
      noData: objectives.filter((item) => item.status === 'no_data').length,
    }
  },
  getStudentOverview(studentId: string, grade: number): StudentOverview {
    const record = records.find((item) => item.studentId === studentId && item.grade === grade)
    const lessons = record?.lessons ?? []
    const all = lessons.flatMap((lesson) =>
      lesson.objectives.map((objective) => ({
        ...objective,
        lesson,
        subject: subjects.find((subject) => subject.id === lesson.subjectId) ?? subjects[0],
      }))
    )
    const active = all.filter((item) => item.status !== 'no_data')
    const masteredObjectives = all.filter((item) => item.status === 'mastered').length
    return {
      progress: active.length
        ? Math.round(active.reduce((sum, item) => sum + item.score, 0) / active.length)
        : 0,
      totalObjectives: all.length,
      masteredObjectives,
      subjects: subjects.map((subject) => this.getSubjectProgress(studentId, grade, subject.id)),
      attention: all
        .filter((item) => item.status === 'needs_practice' || item.status === 'practicing')
        .sort((a, b) => a.score - b.score)
        .slice(0, 3),
      strong: all
        .filter((item) => item.status === 'mastered')
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
      recentActivities: record?.recentActivities ?? [],
    }
  },
})

export const dashboardService = createDashboardService()

```

### src/app/game/admin/dashboard/_data/types.ts

```ts
export type LearningStatus = 'mastered' | 'practicing' | 'needs_practice' | 'no_data'

export interface Student { id: string; name: string; avatar: string; currentGrade: number }
export interface Subject { id: string; name: string }
export interface Game { id: string; name: string; path: string; skillKeys: string[] }
export interface SkillPerformance { attempts: number; correct: number; accuracy: number }
export interface GameEvidence { gameId: string; attempts: number; correct: number; total: number; accuracy: number; bestScore: number; latestScore: number }
export interface Objective { id: string; title: string; score: number; status: LearningStatus; trend: string; skillPerformance: Record<string, SkillPerformance>; games: GameEvidence[] }
export interface Lesson { id: string; order: number; grade: number; subjectId: string; title: string; progress: number; objectives: Objective[] }
export interface RecentActivity { id: string; gameId: string; subjectId: string; lessonId: string; score: number; correct: number; total: number; when: string }
export interface StudentRecord { studentId: string; grade: number; lessons: Lesson[]; recentActivities: RecentActivity[] }
export interface SubjectSummary { subject: Subject; progress: number; total: number; mastered: number; practicing: number; noData: number }
export interface StudentOverview { progress: number; totalObjectives: number; masteredObjectives: number; subjects: SubjectSummary[]; attention: Array<Objective & { lesson: Lesson; subject: Subject }>; strong: Array<Objective & { lesson: Lesson; subject: Subject }>; recentActivities: RecentActivity[] }

```

### src/app/game/admin/dashboard/page.tsx

```tsx
import Dashboard from './_components/Dashboard'
import { getRealDashboardData } from './_data/dashboard.server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getRealDashboardData()
  return <Dashboard initialStudents={data.students} initialRecords={data.records} />
}

```

### src/app/game/admin/error.tsx

```tsx
'use client'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><h2 className="text-xl font-black text-red-700">Không thể tải dữ liệu Firestore</h2><p className="mt-2 text-sm text-red-600">Kiểm tra biến môi trường Firebase Admin và kết nối mạng của server.</p><button type="button" onClick={reset} className="mt-5 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white">Thử lại</button></div>
}


```

### src/app/game/admin/layout.tsx

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, BookOpenCheck, Gamepad2, ListChecks } from 'lucide-react'

export const metadata: Metadata = { title: 'Quản trị theo dõi học tập', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const links = [
  { href: '/game/admin/tracking', label: 'Tổng quan', icon: Activity },
  { href: '/game/admin/session', label: 'Phiên chơi', icon: ListChecks },
  { href: '/game/admin/danh-gia', label: 'Đánh giá bài học', icon: BookOpenCheck },
]

export default function GameAdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><Gamepad2 /></span>
          <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Shop Bé Băng</p><h1 className="text-xl font-black">Theo dõi học tập</h1></div>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold shadow-sm hover:border-blue-300 hover:text-blue-700"><Icon size={17} />{label}</Link>)}
        </nav>
      </div>
    </header>
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">Trang quản trị hiện chưa có xác thực và sẽ công khai nếu deploy.</div>
    <main className="mx-auto max-w-7xl px-4 py-7">{children}</main>
  </div>
}


```

### src/app/game/admin/loading.tsx

```tsx
export default function Loading() {
  return <div className="grid min-h-[50vh] place-items-center"><p className="font-bold text-slate-500">Đang tải dữ liệu học tập…</p></div>
}


```

### src/app/game/admin/page.tsx

```tsx
import { redirect } from 'next/navigation'

export default function GameAdminPage() { redirect('/game/admin/tracking') }


```

### src/app/game/admin/session/page.tsx

```tsx
import { getAdminGameSessions } from '@/lib/gameTrackingAdmin'

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : '—'
const formatDuration = (milliseconds: number) => `${Math.round(milliseconds / 1000)} giây`

export default async function SessionPage() {
  const sessions = await getAdminGameSessions()
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-black">Phiên chơi</h2><p className="mt-1 text-sm text-slate-500">Tối đa 100 phiên mới nhất, sắp xếp theo thời gian hoàn thành.</p></div>
    {!sessions.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Chưa có session thật. Hãy chạy development và hoàn thành một game.</div> :
      <div className="space-y-4">{sessions.map((session) => {
        const attempts = session.results.length
        const accuracy = attempts ? Math.round(session.correctCount / attempts * 100) : 0
        return <article key={session.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2"><p className="text-xs font-bold uppercase text-slate-400">Game</p><p className="font-black text-blue-700">{session.gameId}</p><p className="mt-1 break-all text-xs text-slate-400">{session.id}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">User</p><p className="font-bold">{session.userId}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Bài học</p><p className="font-bold">{session.lessonId}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Kết quả</p><p className="font-bold">{session.score} điểm · {accuracy}%</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Hoàn thành</p><p className="text-sm font-semibold">{formatDate(session.completedAt)}</p><p className="text-xs text-slate-400">{formatDuration(session.duration)}</p></div>
          </div>
          <details className="border-t border-slate-100"><summary className="cursor-pointer px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Xem {attempts} lượt trả lời</summary>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Mục tiêu</th><th>Đáp án</th><th>Đã chọn</th><th>Lần</th><th>Thời gian</th><th>Kết quả</th></tr></thead><tbody>{session.results.map((result, index) => <tr key={`${session.id}-${index}`} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold">{result.learningKey}</td><td>{result.expectedAnswer ?? '—'}</td><td>{result.selectedAnswer ?? '—'}</td><td>{result.attempt}</td><td>{result.responseTime ? `${(result.responseTime / 1000).toFixed(1)}s` : '—'}</td><td className={result.correct ? 'font-bold text-emerald-600' : 'font-bold text-red-600'}>{result.correct ? 'Đúng' : 'Sai'}</td></tr>)}</tbody></table></div>
          </details>
        </article>
      })}</div>}
  </div>
}


```

### src/app/game/admin/tracking/page.tsx

```tsx
import Link from 'next/link'
import { getAdminGameSessions, getAdminLearningProgress } from '@/lib/gameTrackingAdmin'

const percent = (correct: number, attempts: number) => attempts ? Math.round(correct / attempts * 100) : 0

export default async function TrackingPage() {
  const [sessions, progress] = await Promise.all([getAdminGameSessions(), getAdminLearningProgress()])
  const answers = sessions.flatMap((session) => session.results)
  const correct = answers.filter((answer) => answer.correct).length
  const users = new Set(sessions.map((session) => session.userId).filter(Boolean)).size

  const cards = [
    ['Phiên đã lưu', sessions.length], ['Người học', users],
    ['Lượt trả lời', answers.length], ['Độ chính xác', `${percent(correct, answers.length)}%`],
  ]

  return <div className="space-y-7">
    <div><h2 className="text-2xl font-black">Tổng quan tracking</h2><p className="mt-1 text-sm text-slate-500">Dữ liệu tổng hợp từ tối đa 100 phiên gần nhất.</p></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-blue-700">{value}</p></div>)}
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      <Link href="/game/admin/session" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300"><h3 className="font-black">Phiên chơi gần đây</h3><p className="mt-2 text-sm text-slate-500">Xem điểm, thời gian và từng lần trả lời đúng/sai.</p><p className="mt-5 text-sm font-bold text-blue-700">Mở danh sách →</p></Link>
      <Link href="/game/admin/danh-gia" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300"><h3 className="font-black">Đánh giá theo bài</h3><p className="mt-2 text-sm text-slate-500">Có {progress.length} hồ sơ tiến độ đang được tổng hợp.</p><p className="mt-5 text-sm font-bold text-blue-700">Xem mục tiêu mạnh/yếu →</p></Link>
    </section>
  </div>
}


```

### src/app/page.tsx

```tsx
import Image from 'next/image'
import Link from 'next/link'
import {
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  WalletCards,
} from 'lucide-react'

const products = [
  {
    name: 'Đầm Bé Gái Hoa Nhí',
    price: '189.000đ',
    image: '/images/products/product-0001.webp',
  },
  {
    name: 'Set Áo Thun Dễ Thương',
    price: '159.000đ',
    image: '/images/products/product-0002.webp',
  },
  {
    name: 'Bộ Đi Chơi Mùa Hè',
    price: '219.000đ',
    image: '/images/products/product-0003.webp',
  },
  {
    name: 'Váy Công Chúa Bé Băng',
    price: '249.000đ',
    image: '/images/products/product-0004.webp',
  },
]

const categories = ['Bé gái', 'Bé trai', 'Sơ sinh', 'Đồ bộ', 'Phụ kiện']

export default function HomePage() {
  return (
    <main className="bg-white text-slate-900">
      <section className="shop-topbar">
        <div className="shop-container flex items-center justify-between gap-4 text-[11px] font-medium">
          <span>Welcome to Shop Bé Băng</span>
          <span className="hidden sm:inline">Hotline: 0923 456 789</span>
          <span>Register / Login</span>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white">
        <div className="shop-container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black uppercase tracking-wide text-[var(--shop-primary)]">
            Bé Băng
          </Link>

          <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-wide md:flex">
            {['Home', 'Shop', 'Pages', 'Blog', 'Contact'].map((item) => (
              <Link
                key={item}
                href={item === 'Home' ? '/' : '#'}
                className={
                  item === 'Home'
                    ? 'text-[var(--shop-primary)]'
                    : 'text-slate-700 hover:text-[var(--shop-primary)]'
                }
              >
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-slate-700">
            <Search className="h-4 w-4" />
            <Heart className="h-4 w-4" />
            <ShoppingBag className="h-4 w-4" />
            <Menu className="h-5 w-5 md:hidden" />
          </div>
        </div>
      </section>

      <section className="shop-hero">
        <div className="shop-container grid min-h-[430px] items-center gap-8 py-10 md:grid-cols-[0.9fr_1.1fr] md:py-14">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--shop-primary)]">
              New season for little stars
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              Quần áo trẻ em mềm xinh, dễ mặc mỗi ngày
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              Shop Bé Băng chọn các mẫu váy, set đồ và phụ kiện đáng yêu cho bé từ sơ sinh đến 8
              tuổi, ưu tiên chất liệu thoáng mát và form mặc thoải mái.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#products" className="shop-button">
                Shop now
              </Link>
              <Link href="#collections" className="shop-button-outline">
                Xem bộ sưu tập
              </Link>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            <div className="shop-hero-card col-span-2 aspect-[16/10] md:col-span-1 md:aspect-[4/5]">
              <Image
                src="/images/products/product-0001.webp"
                alt="Đầm trẻ em Shop Bé Băng"
                fill
                priority
                className="object-contain p-6"
                sizes="(max-width: 768px) 100vw, 360px"
              />
            </div>
            <div className="grid gap-4">
              <div className="shop-hero-card aspect-square">
                <Image
                  src="/images/products/product-0002.webp"
                  alt="Set áo thun trẻ em"
                  fill
                  className="object-contain p-5"
                  sizes="180px"
                />
              </div>
              <div className="shop-sale-badge">
                <span>35%</span>
                <small>OFF</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="collections" className="shop-container py-7">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="shop-promo bg-[#dff5ff]">
            <div>
              <p>New Arrival</p>
              <h2>Baby dress get 30% off</h2>
              <Link href="#products">Shop now</Link>
            </div>
            <Image
              src="/images/products/product-0003.webp"
              alt="New arrival"
              width={190}
              height={190}
              className="object-contain"
            />
          </article>
          <article className="shop-promo bg-[#ffe1ec]">
            <div>
              <p>New Style</p>
              <h2>Set đồ xinh cho bé</h2>
              <Link href="#products">Shop now</Link>
            </div>
            <Image
              src="/images/products/product-0002.webp"
              alt="Set đồ trẻ em"
              width={180}
              height={180}
              className="object-contain"
            />
          </article>
          <article className="shop-promo bg-[#dff5ff]">
            <div>
              <p>Trendy</p>
              <h2>Collections mới về</h2>
              <Link href="#products">Shop now</Link>
            </div>
            <Image
              src="/images/products/product-0004.webp"
              alt="Collection trẻ em"
              width={185}
              height={185}
              className="object-contain"
            />
          </article>
        </div>
      </section>

      <section id="products" className="shop-container py-10 md:py-14">
        <div className="text-center">
          <h2 className="text-2xl font-black">Popular Products</h2>
          <p className="mt-1 text-sm text-slate-500">Những mẫu được mẹ chọn nhiều nhất tuần này</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button key={category} className="shop-chip" type="button">
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article key={product.name} className="shop-product-card">
              <div className="relative aspect-square bg-[#f4fbff]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 768px) 50vw, 260px"
                />
              </div>
              <div className="pt-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">{product.name}</h3>
                  <span className="text-sm font-bold text-[var(--shop-primary)]">
                    {product.price}
                  </span>
                </div>
                <div className="mt-2 flex gap-0.5 text-[#8ed3ee]" aria-label="5 stars">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3">
        <article className="shop-wide-promo bg-[#92d7f2]">
          <Image
            src="/images/products/product-0002.webp"
            alt="New arrivals"
            width={260}
            height={220}
            className="object-contain"
          />
          <div>
            <p>New Arrivals</p>
            <h2>Up to 35% off</h2>
            <Link href="#products">Shop now</Link>
          </div>
        </article>
        <article className="shop-wide-promo bg-[#7fc9eb]">
          <div>
            <p>Online Shopping</p>
            <h2>Flat 25% off</h2>
            <Link href="#products">Shop now</Link>
          </div>
          <Image
            src="/images/products/product-0003.webp"
            alt="Online shopping"
            width={260}
            height={220}
            className="object-contain"
          />
        </article>
        <article className="shop-wide-promo bg-[#a9ddf5]">
          <div>
            <p>Baby Girl&apos;s</p>
            <h2>Collection mới</h2>
            <Link href="#products">Shop now</Link>
          </div>
          <Image
            src="/images/products/product-0004.webp"
            alt="Baby girls collection"
            width={250}
            height={220}
            className="object-contain"
          />
        </article>
      </section>

      <section className="shop-container grid gap-10 py-12 md:grid-cols-[0.9fr_1.1fr] md:py-16">
        <article className="shop-deal">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--shop-primary)]">
            Best Deal
          </p>
          <h2 className="mt-2 text-2xl font-black">Combo bé đi chơi cuối tuần</h2>
          <Image
            src="/images/products/product-0001.webp"
            alt="Best deal"
            width={320}
            height={320}
            className="mx-auto mt-3 object-contain"
          />
          <div className="mt-4 flex justify-center gap-4 text-center text-xs font-semibold text-slate-500">
            {['307 Days', '22 Hours', '29 Mins', '54 Secs'].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </div>
          <Link href="#products" className="shop-button mt-5">
            Shop now
          </Link>
        </article>

        <div>
          <h2 className="text-2xl font-black">On Sale Products</h2>
          <p className="mt-1 text-sm text-slate-500">Một số mẫu đang ưu đãi trong tháng</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <article key={`sale-${product.name}`} className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0 bg-[#f4fbff]">
                  <Image src={product.image} alt={product.name} fill className="object-contain p-3" sizes="96px" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{product.name}</h3>
                  <p className="mt-1 text-sm font-bold text-[var(--shop-primary)]">
                    {product.price}
                  </p>
                  <div className="mt-1 flex gap-0.5 text-[#8ed3ee]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shop-service-strip">
        <div className="shop-container grid gap-6 py-8 text-center md:grid-cols-3">
          {[
            { icon: Truck, title: 'Free Shipping', text: 'Cho đơn từ 500.000đ' },
            { icon: WalletCards, title: 'Money Back Guarantee', text: 'Đổi trả trong 7 ngày' },
            { icon: ShieldCheck, title: 'Secure Payment', text: 'Thanh toán an toàn' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title}>
                <Icon className="mx-auto h-8 w-8 text-slate-800" />
                <h3 className="mt-2 text-sm font-black">{item.title}</h3>
                <p className="text-xs text-slate-600">{item.text}</p>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}

```

### src/components/games/general/tracking/firestore-game-repository.ts

```ts
import type { CompletedGameSession, GameTrackingRepository, LearningProgress, LessonId } from './types'

export class FirestoreGameTrackingRepository implements GameTrackingRepository {
  async saveSession(session: CompletedGameSession) {
    const response = await fetch('/api/game-tracking/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })
    if (!response.ok) throw new Error(`Game tracking request failed (${response.status})`)
    return response.json() as Promise<{ sessionId: string }>
  }

  async getLearningProgress(userId: string, lessonId: LessonId) {
    const query = new URLSearchParams({ userId, lessonId })
    const response = await fetch(`/api/game-tracking/progress?${query}`)
    if (!response.ok) throw new Error(`Learning progress request failed (${response.status})`)
    const body = await response.json() as { keys?: Partial<LearningProgress> }
    return body.keys ?? {}
  }
}


```

### src/components/games/general/tracking/game-session.ts

```ts
import type { AnswerValue, GameId, GameQuestionResult, GameTrackingRepository, LearningKey, LessonId } from './types'

type TrackerOptions = { userId: string; lessonId: LessonId; gameId: GameId; repository: GameTrackingRepository }
type ActiveQuestion = { learningKey: LearningKey; expectedAnswer?: AnswerValue; startedAt: number; attempt: number }

const devLog = (label: string, value: unknown) => {
  if (process.env.NODE_ENV === 'development') console.info(`[GameTracking] ${label}`, value)
}

export class GameTracker {
  private readonly results: GameQuestionResult[] = []
  private startedAt = Date.now()
  private question?: ActiveQuestion
  private finished = false

  constructor(private readonly options: TrackerOptions) {
    devLog('Start', { userId: options.userId, lessonId: options.lessonId, gameId: options.gameId })
  }

  startQuestion(input: { learningKey: LearningKey; expectedAnswer?: AnswerValue }) {
    this.question = { ...input, startedAt: Date.now(), attempt: 1 }
  }

  recordAnswer(input: { learningKey: LearningKey; correct: boolean; expectedAnswer?: AnswerValue; selectedAnswer?: AnswerValue; responseTime?: number; attempt?: number }) {
    const active = this.question?.learningKey === input.learningKey ? this.question : undefined
    const result: GameQuestionResult = {
      ...input,
      responseTime: input.responseTime ?? (active ? Math.max(0, Date.now() - active.startedAt) : undefined),
      attempt: input.attempt ?? active?.attempt ?? 1,
    }
    this.results.push(result)
    if (active) { active.attempt += 1; active.startedAt = Date.now() }
    devLog('Answer', result)
  }

  async finishSession(score: number) {
    if (this.finished) return
    this.finished = true
    const sessionId = crypto.randomUUID()
    const completedQuestions = this.results.filter((result) => result.correct).length
    const session = {
      sessionId,
      userId: this.options.userId,
      lessonId: this.options.lessonId,
      gameId: this.options.gameId,
      score,
      totalQuestions: completedQuestions,
      correctCount: this.results.filter((result) => result.correct).length,
      wrongCount: this.results.filter((result) => !result.correct).length,
      duration: Math.max(0, Date.now() - this.startedAt),
      startedAt: this.startedAt,
      results: [...this.results],
    }
    try {
      const saved = await this.options.repository.saveSession(session)
      devLog('Session saved', { ...saved, userId: session.userId, lessonId: session.lessonId, gameId: session.gameId })
    } catch (error) {
      this.finished = false
      console.error('[GameTracking] Could not save session; gameplay was not interrupted.', error)
    }
  }
}

```

### src/components/games/general/tracking/game-user.ts

```ts
import { DEV_USER_ID } from './constants'

/** Replace this implementation with Firebase Auth's verified UID when Auth is enabled. */
export function getCurrentGameUserId(): string | null {
  return process.env.NODE_ENV === 'development' ? DEV_USER_ID : null
}


```

### src/components/games/general/tracking/index.ts

```ts
import { FirestoreGameTrackingRepository } from './firestore-game-repository'
import { GameTracker } from './game-session'
import type { GameId, LessonId } from './types'

export * from './constants'
export * from './game-user'
export { GameTracker } from './game-session'
export * from './learning-keys'
export * from './lesson-catalog'
export * from './types'

const repository = new FirestoreGameTrackingRepository()

export function createGameTracker(options: { userId: string; lessonId: LessonId; gameId: GameId }) {
  return new GameTracker({ ...options, repository })
}

export function getLearningProgress(userId: string, lessonId: LessonId) {
  return repository.getLearningProgress(userId, lessonId)
}

```

### src/components/games/general/tracking/types.ts

```ts
import type { GAME_IDS } from './constants'
import type { LearningKey, LessonId } from './lesson-catalog'

export type GameId = (typeof GAME_IDS)[keyof typeof GAME_IDS]
export type { LearningKey, LessonId } from './lesson-catalog'

export type AnswerValue = string | number

export interface GameQuestionResult {
  learningKey: LearningKey
  correct: boolean
  expectedAnswer?: AnswerValue
  selectedAnswer?: AnswerValue
  responseTime?: number
  attempt: number
}

export interface CompletedGameSession {
  sessionId: string
  userId: string
  lessonId: LessonId
  gameId: GameId
  score: number
  totalQuestions: number
  correctCount: number
  wrongCount: number
  duration: number
  startedAt: number
  results: GameQuestionResult[]
}

export type LearningKeyProgress = {
  correct: number
  wrong: number
  attempts: number
  responseTime: number
}

export type LearningProgress = Record<LearningKey, LearningKeyProgress>

export interface GameTrackingRepository {
  saveSession(session: CompletedGameSession): Promise<{ sessionId: string }>
  getLearningProgress(userId: string, lessonId: LessonId): Promise<Partial<LearningProgress>>
}

```

### src/lib/chat/provider.ts

```ts
import { SYSTEM_PROMPTS, type ChatContext } from './constants'

export type ClientMessage = { role: 'user' | 'assistant'; content: string }
type LlmMessage = ClientMessage | { role: 'system'; content: string }
type ChatProvider = 'groq' | 'openai' | 'anthropic'

const CHAT_PROVIDER = (process.env.CHAT_PROVIDER ?? 'groq').toLowerCase() as ChatProvider

function getModelConfig() {
  switch (CHAT_PROVIDER) {
    case 'openai':
      return { provider: 'openai' as const, baseUrl: 'https://api.openai.com/v1', model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY }
    case 'anthropic':
      return { provider: 'anthropic' as const, baseUrl: 'https://api.anthropic.com/v1', model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest', apiKey: process.env.ANTHROPIC_API_KEY }
    case 'groq':
    default:
      return { provider: 'groq' as const, baseUrl: 'https://api.groq.com/openai/v1', model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b', apiKey: process.env.GROQ_API_KEY }
  }
}

export async function callChatModel(clientMessages: ClientMessage[], context: ChatContext): Promise<string> {
  const { provider, baseUrl, model, apiKey } = getModelConfig()
  const systemPrompt = SYSTEM_PROMPTS[context]

  if (!apiKey) throw new Error(`Chưa cấu hình API key cho nhà cung cấp chatbot ${provider}.`)

  const request: { url: string; headers: Record<string, string>; body: object } = provider === 'anthropic'
    ? {
        url: `${baseUrl}/messages`,
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: { model, system: systemPrompt, messages: clientMessages, temperature: 0.6, max_tokens: 350 },
      }
    : {
        url: `${baseUrl}/chat/completions`,
        [REDACTED SECRET-LIKE LINE]
        body: { model, messages: [{ role: 'system', content: systemPrompt }, ...clientMessages] as LlmMessage[], temperature: 0.6, max_tokens: 350 },
      }

  const res = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) })
  if (!res.ok) {
    const responseText = await res.text()
    console.error('LLM request failed:', provider, model, res.status, responseText)
    if (res.status === 401 || res.status === 403) throw new Error(`API key ${provider} không hợp lệ hoặc không có quyền truy cập.`)
    if (res.status === 404) throw new Error(`Model chatbot “${model}” không tồn tại hoặc tài khoản chưa được cấp quyền.`)
    if (res.status === 429) throw new Error('Chatbot đã đạt giới hạn miễn phí. Bạn vui lòng thử lại sau một chút.')
    throw new Error(`Không thể kết nối chatbot (${provider}, mã lỗi ${res.status}).`)
  }

  const data = await res.json()
  const reply = provider === 'anthropic'
    ? data.content?.find((item: { type?: string }) => item.type === 'text')?.text
    : data.choices?.[0]?.message?.content
  return reply ?? 'Mình chưa thể trả lời câu hỏi này. Bạn thử lại giúp mình nhé.'
}

```

### src/lib/firebaseAdmin.ts

```ts
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function getAdminDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing FIREBASE_* env vars')
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }

  return getFirestore()
}

```

### src/lib/users/user.service.ts

```ts
import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebaseAdmin'
import type { CreateUserInput, UpdateUserInput, User, UserRole, UserStatus } from './user.types'
import { createUserSchema, updateUserSchema } from './user.validation'

const usersCollection = () => getAdminDb().collection('shopbebangcom').doc('users').collection('users')
const dateValue = (value: unknown): string | null => value instanceof Timestamp ? value.toDate().toISOString() : null

function mapUser(id: string, data: FirebaseFirestore.DocumentData): User {
  return { userId: id, name: String(data.name ?? ''), email: data.email ? String(data.email) : null, phone: data.phone ? String(data.phone) : null, avatar: data.avatar ? String(data.avatar) : null, role: (data.role ?? 'customer') as UserRole, status: (data.status ?? 'active') as UserStatus, activeGame: data.activeGame !== false, grade: typeof data.grade === 'number' ? data.grade : null, createdAt: dateValue(data.createdAt), updatedAt: dateValue(data.updatedAt), lastLoginAt: dateValue(data.lastLoginAt) }
}

export async function getUsers(): Promise<User[]> {
  const snapshot = await usersCollection().orderBy('createdAt', 'desc').get()
  return snapshot.docs.map(document => mapUser(document.id, document.data()))
}

export async function getUserById(userId: string): Promise<User | null> {
  const snapshot = await usersCollection().doc(userId).get()
  return snapshot.exists ? mapUser(snapshot.id, snapshot.data() ?? {}) : null
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const data = createUserSchema.parse(input)
  const userId = `usr_${crypto.randomUUID()}`
  await usersCollection().doc(userId).create({ userId, ...data, role: 'customer', status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastLoginAt: null })
  const user = await getUserById(userId)
  if (!user) throw new Error('Không thể đọc user vừa tạo')
  return user
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
  const data = updateUserSchema.parse(input)
  const reference = usersCollection().doc(userId)
  if (!(await reference.get()).exists) return null
  await reference.update({ ...data, updatedAt: FieldValue.serverTimestamp() })
  return getUserById(userId)
}

export const setUserStatus = (userId: string, status: UserStatus) => updateUser(userId, { status })
export const setUserGameAccess = (userId: string, activeGame: boolean) => updateUser(userId, { activeGame })

```

### src/lib/users/user.types.ts

```ts
export type UserStatus = 'active' | 'inactive' | 'blocked'
export type UserRole = 'customer' | 'staff' | 'admin'

export interface User {
  userId: string
  name: string
  email: string | null
  phone: string | null
  avatar: string | null
  role: UserRole
  status: UserStatus
  activeGame: boolean
  grade: number | null
  createdAt: string | null
  updatedAt: string | null
  lastLoginAt: string | null
}

export interface CreateUserInput {
  name: string
  email?: string | null
  phone?: string | null
  avatar?: string | null
  grade?: number | null
  activeGame?: boolean
}

export interface UpdateUserInput {
  name?: string
  email?: string | null
  phone?: string | null
  avatar?: string | null
  grade?: number | null
  activeGame?: boolean
  status?: UserStatus
}

```
