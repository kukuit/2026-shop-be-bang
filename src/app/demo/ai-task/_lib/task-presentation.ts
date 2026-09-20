import { displayDate } from './model'

export function capitalizeTaskTitle(title: string): string {
  return title.replace(/^(\s*)(\S)/, (_, space: string, first: string) => space + first.toLocaleUpperCase('vi-VN'))
}

export function displayTaskDate(date: string): string {
  const weekday = new Date(date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long' })
  return `${displayDate(date)} (${capitalizeTaskTitle(weekday.toLocaleLowerCase('vi-VN'))})`
}
