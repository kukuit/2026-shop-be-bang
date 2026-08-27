import { z } from 'zod'

const optionalText = z
  .union([z.string().trim().max(500), z.null()])
  .optional()
  .transform((value) => value || null)
const grade = z
  .union([z.number().int().min(1).max(5), z.null()])
  .optional()
  .transform((value) => value ?? null)

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên không được để trống').max(100),
    username: z
      .string()
      .trim()
      .min(3, 'Username cần ít nhất 3 ký tự')
      .max(50)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Username chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang'),
    password: z.string().min(10, 'Mật khẩu cần ít nhất 10 ký tự').max(200),
    role: z.enum(['user', 'admin']).optional().default('user'),
    email: z
      .union([z.string().trim().email('Email không hợp lệ'), z.literal(''), z.null()])
      .optional()
      .transform((value) => value || null),
    phone: optionalText,
    avatar: optionalText,
    grade,
    activeGame: z.boolean().optional().default(true),
  })
  .strict()

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên không được để trống').max(100).optional(),
    email: z
      .union([z.string().trim().email('Email không hợp lệ'), z.literal(''), z.null()])
      .optional()
      .transform((value) => (value === '' ? null : value)),
    phone: optionalText,
    avatar: optionalText,
    grade,
    activeGame: z.boolean().optional(),
    status: z.enum(['active', 'inactive', 'blocked']).optional(),
  })
  .strict()
