'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Entity, displayName, formatVND } from '../_lib/model'
import { useDemo } from './Provider'
import { RecordTable } from './Records'
import { sum } from '../_services/dashboard'
export default function Detail({ entity, id }: { entity: 'partners' | 'crops' | 'ponds'; id: string }) {
  const { data, loading } = useDemo(); const [tab, setTab] = useState<Entity>('cropExpenses')
  if (loading) return <div className="demo-empty">Đang tải…</div>
  const row = data[entity].find(r => r.id === id)
  if (!row) return <div className="demo-empty">Không tìm thấy bản ghi. <Link href={`/demo/chatbot/${entity}`}>Quay lại</Link></div>
  const key = entity === 'partners' ? 'partnerId' : entity === 'crops' ? 'cropId' : 'pondId'
  const related = (e: Entity) => data[e].filter(r => r[key] === id)
  const revenue = sum(related('harvests'), 'totalAmount'); const expense = sum(related('cropExpenses'), 'amount')
  const metrics = entity === 'partners' ? [['Tổng chi', formatVND(sum(related('transactions').filter(t => t.type === 'expense'), 'amount'))], ['Tổng thu', formatVND(sum(related('transactions').filter(t => t.type === 'income'), 'amount'))], ['Phải thu', formatVND(sum(related('receivables'), 'remainingAmount'))], ['Phải trả', formatVND(sum(related('payables'), 'remainingAmount'))]] : [['Doanh thu', formatVND(revenue)], ['Chi phí', formatVND(expense)], ['Lợi nhuận', formatVND(revenue - expense)], ['Sản lượng', `${sum(related('harvests'), 'quantityKg').toLocaleString('vi-VN')} kg`], ...(entity === 'crops' ? [['Ngày nuôi', Math.max(0, Math.floor((new Date(String(row.endDate || new Date().toISOString())).getTime() - new Date(String(row.startDate)).getTime()) / 86400000)).toString()]] : [])]
  const tabs: [Entity, string][] = [['cropExpenses', 'Chi phí'], ['harvests', 'Thu hoạch'], ['transactions', 'Giao dịch'], ['tasks', 'Công việc'], ['receivables', 'Phải thu'], ['payables', 'Phải trả'], ...(entity === 'ponds' ? [['crops', 'Vụ nuôi'] as [Entity, string]] : [])]
  return <><Link href={`/demo/chatbot/${entity}`}>← Quay lại danh sách</Link><div className="demo-page-heading"><div><small>{row.code || row.phone || 'CHI TIẾT'}</small><h1>{displayName(row)}</h1><p>{entity === 'crops' ? displayName(data.ponds.find(p => p.id === row.pondId)) : row.address || row.location} {row.note}</p></div></div><div className="demo-kpis">{metrics.map(([label, value]) => <article className="demo-kpi" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><div className="demo-tabs">{tabs.map(([e, label]) => <button className={tab === e ? 'demo-primary' : ''} key={e} onClick={() => setTab(e)}>{label}</button>)}</div><section className="demo-panel"><RecordTable entity={tab} rows={related(tab)} /></section><section className="demo-panel"><div className="demo-section-heading"><h2>Lịch sử thay đổi</h2></div>{data.auditLogs.filter(a => a.entityType === entity && a.entityId === id).map(a => <p key={a.id}>{String(a.createdAt)} · {a.action} · {a.source}</p>)}</section></>
}
