import 'server-only'
import { getAdminDb } from '@/lib/firebaseAdmin'
import { Timestamp } from 'firebase-admin/firestore'
import { Collection, collections, Dataset } from '../_lib/model'

export function getDemoRoot() { return getAdminDb().collection('chatbot').doc('demo') }
export function getDemoCollection(name: Collection) {
  if (!collections.includes(name)) throw new Error('Collection demo không hợp lệ')
  return getDemoRoot().collection(name)
}
export function serialize(value: unknown): any {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serialize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]))
  return value
}
export function timestamps(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v && typeof v === 'string' && /At$|Date$/.test(k) ? Timestamp.fromDate(new Date(v)) : v]))
}
export async function getDemoData(): Promise<Dataset> {
  const entries = await Promise.all(collections.map(async name => {
    const snapshot = await getDemoCollection(name).get()
    return [name, snapshot.docs.map(d => ({ ...serialize(d.data()), id: d.id }))]
  }))
  return Object.fromEntries(entries) as Dataset
}
