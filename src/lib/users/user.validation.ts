import { z } from 'zod'

const optionalText = z.union([z.string().trim().max(500), z.null()]).optional().transform(value => value || null)
const grade = z.union([z.number().int().min(1).max(5), z.null()]).optional().transform(value => value ?? null)

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Tên không được để trống').max(100),
  email: z.union([z.string().trim().email('Email không hợp lệ'), z.literal(''), z.null()]).optional().transform(value => value || null),
  phone: optionalText,
  avatar: optionalText,
  grade,
  activeGame: z.boolean().optional().default(true),
}).strict()

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Tên không được để trống').max(100).optional(),
  email: z.union([z.string().trim().email('Email không hợp lệ'), z.literal(''), z.null()]).optional().transform(value => value === '' ? null : value),
  phone: optionalText,
  avatar: optionalText,
  grade,
  activeGame: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
}).strict()
