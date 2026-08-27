export type UserStatus = 'active' | 'inactive' | 'blocked'
export type UserRole = 'user' | 'admin'

export interface User {
  userId: string
  username: string
  name: string
  email: string | null
  phone: string | null
  avatar: string | null
  role: UserRole
  status: UserStatus
  activeGame: boolean
  grade: number | null
  createdAt: string | null
  updatedAt: string | null
  lastLoginAt: string | null
}

export interface CreateUserInput {
  name: string
  username: string
  password: string
  role?: UserRole
  email?: string | null
  phone?: string | null
  avatar?: string | null
  grade?: number | null
  activeGame?: boolean
}

export interface UpdateUserInput {
  name?: string
  email?: string | null
  phone?: string | null
  avatar?: string | null
  grade?: number | null
  activeGame?: boolean
  status?: UserStatus
}
