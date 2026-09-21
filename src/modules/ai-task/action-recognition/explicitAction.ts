import { normalizedText } from './normalizePattern'
import type { TaskAction } from './types'

export function explicitAction(text: string): TaskAction | undefined {
  const t = normalizedText(text)
  // Negation and hypothetical requests need semantic parsing; never execute a keyword.
  if (/\b(dung|khong nen|co nen|neu|gia su)\b/.test(t)) return
  if (/^(?:hay |giup toi |cho toi )?(?:tim|tim kiem|tra cuu)\b/.test(t)) return 'task.search'
  if (/(?:\?|\bmay gio\b|\bkhi nao\b)/.test(t) && !/chi tiet|the nao roi|viec gi/.test(t))
    return 'task.search'
  if (/chi tiet|the nao roi/.test(t)) return 'task.detail'
  if (/liet ke|danh sach|viec gi|con viec nao/.test(t)) return 'task.list'
  if (/^(?:them )?ghi chu\b/.test(t)) return 'task.note'
  if (/khoi phuc/.test(t)) return 'task.restore'
  if (/^(?:hay |giup toi )?xoa (?:viec|task|cong viec|no|cai)\b/.test(t)) return 'task.delete'
  if (/^(?:hay )?huy (?:viec|task|cong viec|no|cai)\b|khong lam .* nua|^bo lich\b/.test(t))
    return 'task.cancel'
  if (/\bxong roi\b|danh dau hoan thanh|^hoan thanh\b/.test(t)) return 'task.complete'
  if (/\d+\s*%|mot nua|cap nhat tien do/.test(t)) return 'task.progress'
  if (/doi ten|chuyen .* (?:nhom|task cha|viec cha)|doi (?:task|viec|cong viec) cha/.test(t))
    return 'task.update'
  if (/\bdoi(?: .*?)? sang\b|\bdoi lich\b|\bchuyen(?: .*?)? sang\b|tre them|mai moi lam/.test(t))
    return 'task.reschedule'
  if (/uu tien|(?:cai|viec|task).*\bgap\b|binh thuong thoi/.test(t)) return 'task.priority'
  if (/^(?:them|tao)(?: giup toi)?\s/.test(t)) return 'task.create'
}

export function correctionAction(text: string): TaskAction | undefined {
  const t = normalizedText(text)
  if (!/^(khong[,!. ]|y (?:toi|minh) la |khong phai[, ]|hieu nham[, ])/.test(t)) return
  return explicitAction(t.replace(/^(?:khong phai|khong|y (?:toi|minh) la|hieu nham)[,!. ]+/, ''))
}
