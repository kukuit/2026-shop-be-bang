export function normalizedText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
export function normalizePattern(text: string) {
  return normalizedText(text)
    .replace(/\b\d{1,2}(?:h|:)(?:\d{2})?\b/g, '{time}')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, '{date}')
    .replace(/\bthu [2-7]\b/g, 'thu {weekday}')
    .replace(/\bngay \d{1,2}\b/g, 'ngay {day}')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, '{number}')
    .replace(/[.!?]+$/g, '')
    .trim()
}
