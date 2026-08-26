import { DEV_USER_ID } from './constants'

/** Replace this implementation with Firebase Auth's verified UID when Auth is enabled. */
export function getCurrentGameUserId(): string | null {
  return process.env.NODE_ENV === 'development' ? DEV_USER_ID : null
}

