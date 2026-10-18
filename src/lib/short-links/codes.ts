import { randomInt } from 'node:crypto'
import { isReservedShortCode, isValidShortCodeFormat } from './code-format'

const SHORT_CODE_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateShortCode(length = 6) {
  if (!Number.isInteger(length) || length < 1 || length > 32) throw new RangeError('Invalid short code length')
  return Array.from({ length }, () => SHORT_CODE_CHARSET[randomInt(SHORT_CODE_CHARSET.length)]).join('')
}

export function isValidShortCode(value: unknown) {
  return isValidShortCodeFormat(value) && !isReservedShortCode(value)
}
