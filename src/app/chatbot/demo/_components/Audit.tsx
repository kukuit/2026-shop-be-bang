'use client'
import { useState } from 'react'
import { useDemo } from './Provider'
import { formatDate } from '../_lib/model'
export default function Audit() {
  const { data, loading } = useDemo(); const [search, setSearch] = useState('')
  return <><div className="demo-page-heading"><div><h1>Nhật ký hoạt động</h1><p>Lịch sử tự động từ service · Giá trị trước/sau và nguồn nhập liệu</p></div></div><section className="demo-panel demo-padded"><input aria-label="Tìm nhật ký" placeholder="Tìm module, ID hoặc nguồn…" value={search} onChange={e => setSearch(e.target.value)} />{loading ? <p>Đang tải…</p> : data.auditLogs.length ? <div className="demo-table-wrap"><table><thead><tr><th>Thời gian</th><th>Module / ID</th><th>Thao tác</th><th>Nguồn</th><th>Trước / Sau</th></tr></thead><tbody>{[...data.auditLogs].reverse().filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())).map(r => <tr key={r.id}><td>{formatDate(r.createdAt)}</td><td>{r.entityType}<small>{r.entityId}</small></td><td>{r.action}</td><td>{r.source}</td><td><details><summary>Xem thay đổi</summary><pre>{JSON.stringify({ before: r.before, after: r.after }, null, 2)}</pre></details></td></tr>)}</tbody></table></div> : <div className="demo-empty">Chưa có hoạt động.</div>}</section></>
}
