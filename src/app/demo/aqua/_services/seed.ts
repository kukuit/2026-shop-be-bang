import 'server-only'
import { mutate } from './business'
import { Entity, today } from '../_lib/model'
import { getDemoData, getDemoRoot } from './repository'

export async function seedDemo() {
  const expectedGeneration = Number((await getDemoRoot().get()).get('generation') || 0)
  const current = await getDemoData()
  if (current.partners.length || current.ponds.length || current.transactions.length) throw new Error('Chỉ tạo mẫu khi demo trống. Reset trước nếu muốn tạo lại.')
  const ids: Record<string, string> = {}
  const add = async (entity: Entity, key: string, data: Record<string, unknown>) => { const result = await mutate({ entity, data, operation: 'save', requestId: `seed_${key}`, expectedGeneration }); ids[key] = result.id }
  for (const [key, name, type] of [['tt', 'Tấn Thành', 'supplier'], ['mp', 'Minh Phú', 'customer'], ['dl', 'Điện lực', 'supplier']]) await add('partners', key, { name, type, status: 'active' })
  const categories = ['Bán tôm', 'Thu công nợ', 'Thu khác', 'Con giống', 'Thức ăn', 'Thuốc', 'Hóa chất', 'Khoáng', 'Điện', 'Dầu', 'Nhân công', 'Vận chuyển', 'Sửa chữa', 'Máy móc', 'Chi phí ao', 'Khác']
  for (let i = 0; i < categories.length; i++) await add('categories', `category${i}`, { name: categories[i], type: i < 3 ? 'income' : 'expense' })
  for (let i = 1; i <= 3; i++) await add('ponds', `pond${i}`, { code: `A0${i}`, name: `Ao A0${i}`, area: 2500 + i * 500, status: i === 3 ? 'maintenance' : 'active', location: 'Khu nuôi số 1' })
  for (let i = 1; i <= 3; i++) await add('crops', `crop${i}`, { code: `V0${i}`, name: `Vụ ${i}/${today().slice(0, 4)}`, pondId: ids[i === 3 ? 'pond2' : 'pond1'], startDate: `${today().slice(0, 4)}-01-01`, status: i === 1 ? 'completed' : 'active', seedQuantity: 150000 })
  for (let i = 0; i < 5; i++) await add('cropExpenses', `expense${i}`, { pondId: ids.pond1, cropId: ids.crop2, categoryId: ids[`category${[3, 4, 5, 8, 10][i]}`], partnerId: ids.tt, amount: [30000000, 100000000, 15000000, 18000000, 25000000][i], description: categories[[3, 4, 5, 8, 10][i]], expenseDate: today() })
  for (let i = 0; i < 3; i++) await add('harvests', `harvest${i}`, { pondId: ids.pond1, cropId: ids.crop2, harvestDate: today(), quantityKg: [1200, 800, 500][i], pricePerKg: 145000, shrimpSize: 30, partnerId: ids.mp, paymentStatus: ['paid', 'partial', 'unpaid'][i], paidAmount: i === 1 ? 50000000 : 0 })
  await add('payables', 'debt', { partnerId: ids.tt, originalAmount: 350000000, description: 'Công nợ đầu kỳ thức ăn', dueAt: today() })
  for (let i = 0; i < 4; i++) await add('tasks', `task${i}`, { title: ['Kiểm tra nước ao A01', 'Thanh toán Tấn Thành', 'Đối chiếu công nợ Minh Phú', 'Chuẩn bị thu tôm'][i], dueAt: `${today()}T${8 + i * 2}:00`.replace('T8:', 'T08:'), status: i === 0 ? 'completed' : 'pending', priority: i === 1 ? 'high' : 'normal', pondId: ids.pond1 })
  return { message: 'Đã tạo dữ liệu mẫu' }
}
