export type AuthRole = 'user' | 'admin'
export type AuthStatus = 'active' | 'inactive'

export type SafeAuthUser = {
  id: string
  username: string
  displayName: string
  role: AuthRole
  status: AuthStatus
  activeGame: boolean
}

export type AccessTokenPayload = { sub: string; sessionId: string; type: 'access'; exp: number }
export type RefreshTokenPayload = { sessionId: string; secret: string }
