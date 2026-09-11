// API dates are ISO-8601 strings. The repository converts persisted dates to
// Firebase Timestamp and back at the server boundary.
export type DateValue = string
export interface BaseEntity { id: string; createdAt: DateValue; updatedAt: DateValue; ownerId: string | null; createdBy: string | null }
export interface Links { partnerId?: string; pondId?: string; cropId?: string }
export interface Evidence { attachmentUrl?: string; note?: string }
export interface Task extends BaseEntity, Links { title: string; description?: string; status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; priority: 'low' | 'normal' | 'high' | 'urgent'; dueAt: DateValue; completedAt?: DateValue | null; remindAt?: DateValue; transactionId?: string }
export interface Reminder extends BaseEntity { taskId: string; title: string; remindAt: DateValue; status: 'pending' }
export interface Partner extends BaseEntity { name: string; normalizedName: string; type: 'supplier' | 'customer' | 'both' | 'other'; phone?: string; address?: string; taxCode?: string; note?: string; status: 'active' | 'inactive' }
export interface Category extends BaseEntity { name: string; type: 'income' | 'expense' }
export interface Pond extends BaseEntity { code: string; name: string; area?: number; location?: string; note?: string; status: 'active' | 'inactive' | 'maintenance' }
export interface Crop extends BaseEntity { pondId: string; code: string; name: string; startDate: DateValue; expectedEndDate?: DateValue; endDate?: DateValue; status: 'planning' | 'active' | 'harvesting' | 'completed' | 'cancelled'; seedQuantity?: number; seedCost?: number; note?: string }
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export interface Transaction extends BaseEntity, Links, Evidence { type: 'income' | 'expense'; amount: number; categoryId?: string; description: string; transactionDate: DateValue; sourceType: 'manual' | 'harvest' | 'crop_expense' | 'debt_payment'; sourceId?: string; paymentStatus: PaymentStatus }
export interface CropExpense extends BaseEntity, Evidence { cropId: string; pondId: string; categoryId: string; partnerId?: string; amount: number; description: string; expenseDate: DateValue; transactionId: string }
export interface Harvest extends BaseEntity, Evidence { pondId: string; cropId: string; harvestDate: DateValue; harvestNo?: number; quantityKg: number; shrimpSize?: number; pricePerKg: number; totalAmount: number; partnerId?: string; paymentStatus: PaymentStatus; paidAmount: number; transactionId?: string; receivableId?: string }
export interface Debt extends BaseEntity, Links { partnerId: string; originalAmount: number; paidAmount: number; remainingAmount: number; description: string; dueAt?: DateValue; status: PaymentStatus | 'overdue'; harvestId?: string; note?: string }
export interface AuditLog { id: string; entityType: string; entityId: string; action: string; before: unknown; after: unknown; source: 'form' | 'chat' | 'voice' | 'import'; createdAt: DateValue; createdBy: null }
export interface ImportJob { id: string; fileName: string; entityType: string; totalRows: number; successRows: number; errorRows: number; status: 'running' | 'completed' | 'failed'; createdAt: DateValue }
