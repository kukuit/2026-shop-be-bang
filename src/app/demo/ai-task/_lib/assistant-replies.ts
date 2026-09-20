import type { Action, Filters } from './model'

export function taskReply(action: Action, title: string, confirmed = false): string {
  const name = `“${title}”`
  switch (action) {
    case 'CREATE_TASK': case 'CREATE_SUBTASK': return confirmed ? `Xong, mình đã thêm ${name}.` : `Bạn kiểm tra lại thông tin trước khi mình thêm ‘${title}’ nhé!`
    case 'COMPLETE_TASK': return confirmed ? `Xong, ${name} đã hoàn thành.` : `Mình sẽ đánh dấu ${name} là hoàn thành nhé.`
    case 'UPDATE_TASK': return confirmed ? `Đã cập nhật ${name}.` : `Mình cập nhật ${name} nhé.`
    case 'CANCEL_TASK': return confirmed ? `Đã hủy ${name}.` : `Bạn muốn hủy ${name} đúng không?`
    case 'DELETE_TASK': return confirmed ? `Đã chuyển ${name} vào thùng rác.` : `Bạn muốn chuyển ${name} vào thùng rác đúng không?`
    case 'RESTORE_TASK': return confirmed ? `Đã khôi phục ${name}.` : `Mình khôi phục ${name} nhé.`
    default: return `Đây là việc ${name}.`
  }
}

export function taskListReply(filters: Filters, total: number, shown: number): string {
  if (!total) return filters.view === 'today' ? 'Hôm nay bạn không còn việc nào theo lựa chọn này.' : 'Mình chưa thấy việc nào theo lựa chọn này.'
  const lead = filters.recommend ? `Bạn có ${total} việc, mình gợi ý ưu tiên những việc này:`
    : filters.view === 'today' ? `Hôm nay bạn còn ${total} việc:`
    : filters.view === 'upcoming' ? `Sắp tới bạn có ${total} việc:`
    : filters.view === 'overdue' ? `Bạn còn ${total} việc đã quá hạn:`
    : filters.view === 'completed' ? `Bạn đã hoàn thành ${total} việc:`
    : filters.view === 'deleted' ? `Có ${total} việc trong thùng rác:`
    : `Bạn có ${total} việc theo lựa chọn này:`
  return total > shown ? `${lead}\nMình gửi ${shown} việc trước. Bạn có thể nói rõ hơn để mình tìm tiếp.` : lead
}

// Guard free-form AI replies; structured action replies use the real task title.
export function conversationalReply(reply: string): string {
  return /\b(field|context|memory|resolver|default|database|firestore|parsed data|confirmed value|groupId|parentId)\b|bộ nhớ|ngữ cảnh|giá trị mặc định|trường còn thiếu|merge context|dữ liệu đã được ghi/i.test(reply)
    ? 'Bạn muốn mình giúp việc gì tiếp theo?'
    : reply
}
