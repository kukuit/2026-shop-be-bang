'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { ProductAttributes, ProductImage, ProductSizeGuide, ProductVariant, ProductVariantConfig } from '@/lib/products/types'
import { MAX_PRODUCT_VARIANTS, MAX_VARIANT_STOCK, calculateTotalStock, generateVariantCombinations } from '@/lib/products/variants'

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

export function ProductAttributesSection({ value, onChange }: { value: ProductAttributes; onChange: (value: ProductAttributes) => void }) {
  const set = (key: keyof ProductAttributes, nextValue: string) => onChange({ ...value, [key]: nextValue })
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <h3 className="text-lg font-black">Đặc điểm sản phẩm</h3>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Đối tượng sử dụng"><select value={value.gender ?? ''} onChange={event => set('gender', event.target.value)} className="input"><option value="">Chưa chọn</option><option value="boy">Bé trai</option><option value="girl">Bé gái</option><option value="unisex">Unisex</option><option value="man">Nam</option><option value="woman">Nữ</option><option value="other">Khác</option></select></Field>
      <TextField label="Chất liệu" value={value.material ?? ''} onChange={next => set('material', next)} />
      <TextField label="Độ tuổi phù hợp" value={value.ageRange ?? ''} onChange={next => set('ageRange', next)} placeholder="Ví dụ: 2–6 tuổi" />
      <TextField label="Kiểu dáng" value={value.style ?? ''} onChange={next => set('style', next)} />
      <TextField label="Thương hiệu" value={value.brand ?? ''} onChange={next => set('brand', next)} />
      <TextField label="Xuất xứ" value={value.origin ?? ''} onChange={next => set('origin', next)} />
      <div className="sm:col-span-2"><label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Hướng dẫn bảo quản</span><textarea rows={3} maxLength={1000} value={value.careInstructions ?? ''} onChange={event => set('careInstructions', event.target.value)} className="input min-h-24 resize-y" /></label></div>
    </div>
  </section>
}

export function ProductSizeGuideSection({ rows, onChange, onRequestRemove }: { rows: ProductSizeGuide[]; onChange: (rows: ProductSizeGuide[]) => void; onRequestRemove: (id: string) => void }) {
  const update = (id: string, key: keyof ProductSizeGuide, value: string) => onChange(rows.map(row => row.id !== id ? row : {
    ...row,
    [key]: key === 'size' ? value : value === '' ? undefined : Number(value),
  }))
  const reorder = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  return <section id="product-size-guide" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Hướng dẫn chọn size</h3><p className="mt-1 text-sm text-slate-500">Bảng này để trống nếu sản phẩm không có hướng dẫn size.</p></div><button type="button" onClick={() => onChange([...rows, { id: newId('guide'), size: '' }])} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink-200 px-3 py-2 text-sm font-bold text-pink-700 hover:bg-pink-50"><Plus size={16} />Thêm dòng</button></div>
    {rows.length > 0 && <div className="mt-4 space-y-3">
      {rows.map((row, index) => <div key={row.id} className="rounded-2xl border border-slate-200 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SizeTextField label="Size *" value={row.size} onChange={value => update(row.id, 'size', value)} error={!row.size.trim() ? 'Nhập tên size.' : rows.some(other => other.id !== row.id && other.size.trim().toLocaleLowerCase('vi-VN') === row.size.trim().toLocaleLowerCase('vi-VN')) ? 'Size này đã có.' : ''} />
          <NumberField label="Cân nặng từ (kg)" value={row.minWeight} onChange={value => update(row.id, 'minWeight', value)} error={numericError(row.minWeight, row.minWeight !== undefined && row.maxWeight !== undefined && row.minWeight > row.maxWeight ? 'Giá trị từ phải nhỏ hơn hoặc bằng đến.' : '')} />
          <NumberField label="Cân nặng đến (kg)" value={row.maxWeight} onChange={value => update(row.id, 'maxWeight', value)} error={numericError(row.maxWeight, row.minWeight !== undefined && row.maxWeight !== undefined && row.minWeight > row.maxWeight ? 'Giá trị đến phải lớn hơn hoặc bằng từ.' : '')} />
          <NumberField label="Chiều cao từ (cm)" value={row.minHeight} onChange={value => update(row.id, 'minHeight', value)} error={numericError(row.minHeight, row.minHeight !== undefined && row.maxHeight !== undefined && row.minHeight > row.maxHeight ? 'Giá trị từ phải nhỏ hơn hoặc bằng đến.' : '')} />
          <NumberField label="Chiều cao đến (cm)" value={row.maxHeight} onChange={value => update(row.id, 'maxHeight', value)} error={numericError(row.maxHeight, row.minHeight !== undefined && row.maxHeight !== undefined && row.minHeight > row.maxHeight ? 'Giá trị đến phải lớn hơn hoặc bằng từ.' : '')} />
        </div>
        <div className="mt-3 flex justify-end gap-1"><button type="button" onClick={() => reorder(index, -1)} disabled={index === 0} aria-label="Chuyển dòng size lên" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={16} /></button><button type="button" onClick={() => reorder(index, 1)} disabled={index === rows.length - 1} aria-label="Chuyển dòng size xuống" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={16} /></button><button type="button" onClick={() => onRequestRemove(row.id)} aria-label={`Xóa size ${row.size || index + 1}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button></div>
      </div>)}
    </div>}
  </section>
}

type PendingRemoval = { kind: 'colors'; id: string; name: string; affectedStock: number }

export function ProductVariantsSection({
  hasVariants,
  config,
  variants,
  images,
  productSlug,
  originalStock,
  busy,
  stockConfirmationRequired,
  confirmedStockTotal,
  pendingDisable,
  onToggle,
  onConfigChange,
  onVariantsChange,
  onConfirmStock,
  onCancelDisable,
  onConfirmDisable,
}: {
  hasVariants: boolean
  config: ProductVariantConfig
  variants: ProductVariant[]
  images: ProductImage[]
  productSlug: string
  originalStock: number
  busy: boolean
  stockConfirmationRequired: boolean
  confirmedStockTotal: number | null
  pendingDisable: boolean
  onToggle: (enabled: boolean) => void
  onConfigChange: (config: ProductVariantConfig) => void
  onVariantsChange: (variants: ProductVariant[]) => void
  onConfirmStock: (total: number) => void
  onCancelDisable: () => void
  onConfirmDisable: () => void
}) {
  const [newColor, setNewColor] = useState('')
  const [error, setError] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null)
  const totalStock = useMemo(() => calculateTotalStock(variants), [variants])
  const skuCounts = new Map<string, number>()
  variants.forEach(variant => {
    const sku = variant.sku.trim().toLocaleUpperCase('vi-VN')
    skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1)
  })

  const applyConfig = (next: ProductVariantConfig) => {
    const generated = generateVariantCombinations(next, variants, productSlug)
    if (!generated) {
      setError(`Tổ hợp vượt quá ${MAX_PRODUCT_VARIANTS} biến thể. Hãy giảm số màu hoặc size.`)
      return false
    }
    setError('')
    onConfigChange(next)
    onVariantsChange(generated)
    return true
  }

  const addOption = () => {
    const name = newColor.trim()
    if (!name) { setError('Nhập tên màu trước khi thêm.'); return }
    const kind = 'colors' as const
    const current = config[kind]
    if (current.some(option => option.name.trim().toLocaleLowerCase('vi-VN') === name.toLocaleLowerCase('vi-VN'))) {
      setError('Tên màu này đã có trong danh sách.')
      return
    }
    if (applyConfig({ ...config, colors: [...current, { id: newId('color'), name }] })) setNewColor('')
  }

  const removeOption = (pending: PendingRemoval) => {
    const next = { ...config, [pending.kind]: config[pending.kind].filter(option => option.id !== pending.id) }
    applyConfig(next)
    setPendingRemoval(null)
  }

  const requestRemove = (id: string, name: string) => {
    const affectedStock = calculateTotalStock(variants.filter(variant => variant.colorId === id))
    const pending: PendingRemoval = { kind: 'colors', id, name, affectedStock }
    if (affectedStock > 0) setPendingRemoval(pending)
    else removeOption(pending)
  }

  const updateOption = (id: string, field: 'name' | 'imageUrl', value: string) => {
    const kind = 'colors' as const
    const next = {
      ...config,
      [kind]: config[kind].map(option => option.id !== id ? option : {
        ...option,
        [field]: field === 'imageUrl' ? value || undefined : value,
      }),
    }
    if (field === 'name') {
      const duplicate = next[kind].some(option => option.id !== id && option.name.trim().toLocaleLowerCase('vi-VN') === value.trim().toLocaleLowerCase('vi-VN'))
      if (duplicate) { setError('Tên màu hoặc size đã tồn tại.'); return }
      const generated = generateVariantCombinations(next, variants, productSlug)
      if (generated) { setError(''); onConfigChange(next); onVariantsChange(generated) }
      return
    }
    onConfigChange(next)
  }

  const updateVariant = (id: string, key: keyof ProductVariant, value: string) => onVariantsChange(variants.map(variant => variant.id !== id ? variant : {
    ...variant,
    [key]: key === 'stock' ? value === '' ? 0 : Number(value)
      : key === 'price' ? value === '' ? null : Number(value)
        : key === 'imageUrl' ? value || undefined : value,
  }))
  const guideText = (variant: ProductVariant) => [variant.color, variant.size].filter(Boolean).join(' / ') || 'Mặc định'

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <h3 className="text-lg font-black">Phân loại sản phẩm</h3>
    <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="checkbox" checked={hasVariants} disabled={busy} onChange={event => onToggle(event.target.checked)} className="mt-0.5 h-5 w-5 accent-pink-500" />
      <span><span className="block font-bold text-slate-800">Sản phẩm có phân loại màu sắc / size</span><span className="mt-1 block text-sm text-slate-500">Tắt để dùng tồn kho tổng như trước. Có thể chỉ khai báo màu hoặc chỉ khai báo size.</span></span>
    </label>
    {pendingDisable && <div role="alertdialog" aria-label="Xác nhận tắt phân loại" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-bold">Tắt phân loại sản phẩm?</p><p className="mt-1">Dữ liệu biến thể sẽ không còn được dùng. Tồn kho tổng sẽ chuyển thành {totalStock}.</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancelDisable} className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-bold">Giữ phân loại</button><button type="button" onClick={onConfirmDisable} className="rounded-lg bg-amber-700 px-3 py-2 font-bold text-white">Xác nhận tắt</button></div>
    </div>}
    {!hasVariants && <p className="mt-3 text-sm text-slate-500">Sản phẩm hiện dùng trường tồn kho tổng trong phần Quản lý hiển thị.</p>}
    {hasVariants && <>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <OptionManager title="Màu sắc" options={config.colors} images={images} busy={busy} newValue={newColor} onNewValue={setNewColor} onAdd={addOption} onUpdate={updateOption} onRemove={requestRemove} />
        <div className="rounded-2xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800">Size</h4>
          <p className="mt-2 text-sm text-slate-500">Size được lấy từ bảng hướng dẫn chọn size để tên size và bảng số đo luôn khớp.</p>
          {config.sizes.length ? <div className="mt-3 flex flex-wrap gap-2">{config.sizes.map(size => <span key={size.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{size.name || 'Chưa nhập tên size'}</span>)}</div> : <p className="mt-3 text-sm font-medium text-slate-500">Chưa có size. Hãy thêm size ở bảng hướng dẫn chọn size phía trên.</p>}
          <a href="#product-size-guide" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink-200 px-3 py-2 text-sm font-bold text-pink-700 hover:bg-pink-50">Đến bảng hướng dẫn chọn size</a>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span>{variants.length} / {MAX_PRODUCT_VARIANTS} biến thể</span><span className="font-bold">Tổng tồn kho: {totalStock}</span></div>
      {stockConfirmationRequired && confirmedStockTotal !== totalStock && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Bạn đang chuyển sản phẩm từ tồn kho tổng sang phân loại.</p><p className="mt-1">Tồn kho cũ là {originalStock}. Hệ thống không tự chia số lượng này; hãy nhập tồn kho thực tế cho từng biến thể. Tổng mới hiện tại là {totalStock}.</p><button type="button" onClick={() => onConfirmStock(totalStock)} className="mt-3 rounded-lg bg-amber-700 px-3 py-2 font-bold text-white">Xác nhận tổng tồn kho biến thể</button></div>}
      {(config.colors.length || config.sizes.length) ? variants.length ? <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[...(config.colors.length ? ['Màu'] : []), ...(config.sizes.length ? ['Size'] : []), 'SKU', 'Tồn kho', 'Giá riêng (VND)', 'Ảnh riêng', ''].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{variants.map(variant => {
          const sku = variant.sku.trim().toLocaleUpperCase('vi-VN')
          const skuError = !sku ? 'Nhập SKU.' : (skuCounts.get(sku) ?? 0) > 1 ? 'SKU bị trùng.' : ''
          const stockError = !Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > MAX_VARIANT_STOCK ? `Nhập số nguyên từ 0 đến ${MAX_VARIANT_STOCK}.` : ''
          const priceError = variant.price !== null && variant.price !== undefined && (!Number.isSafeInteger(variant.price) || variant.price < 1) ? 'Giá phải là số nguyên lớn hơn 0.' : ''
          return <tr key={variant.id}>
          {config.colors.length > 0 && <td className="px-3 py-3">{variant.color}</td>}{config.sizes.length > 0 && <td className="px-3 py-3">{variant.size}</td>}
          <td className="px-3 py-3"><input aria-label={`SKU ${guideText(variant)}`} aria-invalid={Boolean(skuError)} value={variant.sku} onChange={event => updateVariant(variant.id, 'sku', event.target.value)} maxLength={100} disabled={busy} className={`w-44 rounded-lg border px-2.5 py-2 ${skuError ? 'border-rose-500' : 'border-slate-200'}`} />{skuError && <FieldError>{skuError}</FieldError>}</td>
          <td className="px-3 py-3"><input aria-label={`Tồn kho ${guideText(variant)}`} aria-invalid={Boolean(stockError)} type="number" min="0" max={MAX_VARIANT_STOCK} step="1" value={variant.stock} onChange={event => updateVariant(variant.id, 'stock', event.target.value)} disabled={busy} className={`w-24 rounded-lg border px-2.5 py-2 ${stockError ? 'border-rose-500' : 'border-slate-200'}`} />{stockError && <FieldError>{stockError}</FieldError>}</td>
          <td className="px-3 py-3"><input aria-label={`Giá riêng ${guideText(variant)}`} aria-invalid={Boolean(priceError)} type="number" min="1" step="1" placeholder="Theo giá sản phẩm" value={variant.price ?? ''} onChange={event => updateVariant(variant.id, 'price', event.target.value)} disabled={busy} className={`w-36 rounded-lg border px-2.5 py-2 ${priceError ? 'border-rose-500' : 'border-slate-200'}`} />{priceError && <FieldError>{priceError}</FieldError>}</td>
          <td className="px-3 py-3"><select aria-label={`Ảnh riêng ${guideText(variant)}`} value={variant.imageUrl ?? ''} onChange={event => updateVariant(variant.id, 'imageUrl', event.target.value)} disabled={busy} className="w-40 rounded-lg border border-slate-200 bg-white px-2.5 py-2"><option value="">Dùng ảnh màu / ảnh chính</option>{images.map(image => <option key={image.id} value={image.url}>{image.alt || `Ảnh ${image.sortOrder + 1}`}</option>)}</select></td>
          <td className="px-3 py-3 text-xs text-slate-500">{variant.imageUrl ? 'Có ảnh riêng' : variant.colorId && config.colors.find(color => color.id === variant.colorId)?.imageUrl ? 'Dùng ảnh màu' : 'Dùng ảnh chính'}</td>
        </tr>
        })}</tbody></table>
      </div> : <p className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Cần ít nhất một màu hoặc size để tạo biến thể.</p> : null}
      {pendingRemoval && <div role="alertdialog" aria-label="Xác nhận xóa phân loại" className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"><p className="font-bold">Xóa màu “{pendingRemoval.name}”?</p><p className="mt-1">Các biến thể liên quan đang có tổng tồn kho {pendingRemoval.affectedStock}. Chỉ thay đổi dữ liệu trên biểu mẫu cho đến khi bạn lưu.</p><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setPendingRemoval(null)} className="rounded-lg border border-rose-300 bg-white px-3 py-2 font-bold">Hủy</button><button type="button" onClick={() => removeOption(pendingRemoval)} className="rounded-lg bg-rose-700 px-3 py-2 font-bold text-white">Xóa phân loại</button></div></div>}
    </>}
  </section>
}

function OptionManager({ title, options, images, busy, newValue, onNewValue, onAdd, onUpdate, onRemove }: {
  title: string
  options: ProductVariantConfig['colors']
  images: ProductImage[]
  busy: boolean
  newValue: string
  onNewValue: (value: string) => void
  onAdd: () => void
  onUpdate: (id: string, field: 'name' | 'imageUrl', value: string) => void
  onRemove: (id: string, name: string) => void
}) {
  return <div className="rounded-2xl border border-slate-200 p-4">
    <h4 className="font-bold text-slate-800">{title}</h4>
    <div className="mt-3 space-y-2">{options.map(option => {
      const optionError = !option.name.trim() ? 'Nhập tên phân loại.' : options.some(other => other.id !== option.id && other.name.trim().toLocaleLowerCase('vi-VN') === option.name.trim().toLocaleLowerCase('vi-VN')) ? 'Tên phân loại này đã có.' : ''
      return <div key={option.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <div><input aria-label={`Tên ${title.toLocaleLowerCase('vi-VN')}`} aria-invalid={Boolean(optionError)} value={option.name} onChange={event => onUpdate(option.id, 'name', event.target.value)} maxLength={80} disabled={busy} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${optionError ? 'border-rose-500' : 'border-slate-200'}`} />{optionError && <FieldError>{optionError}</FieldError>}</div>
        {images.length > 0 ? <select aria-label={`Ảnh đại diện ${option.name}`} value={option.imageUrl ?? ''} onChange={event => onUpdate(option.id, 'imageUrl', event.target.value)} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Dùng ảnh chính</option>{images.map(image => <option key={image.id} value={image.url}>{image.alt || `Ảnh ${image.sortOrder + 1}`}</option>)}</select> : <span />}
        <button type="button" onClick={() => onRemove(option.id, option.name)} disabled={busy} aria-label={`Xóa ${title.toLocaleLowerCase('vi-VN')} ${option.name}`} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={16} />Xóa</button>
      </div>
    })}</div>
    <div className="mt-3 flex gap-2"><input value={newValue} onChange={event => onNewValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onAdd() } }} disabled={busy} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm" placeholder={`Tên ${title.toLocaleLowerCase('vi-VN')} mới`} /><button type="button" onClick={onAdd} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} />Thêm</button></div>
    {title === 'Màu sắc' && <p className="mt-2 text-xs text-slate-500">Ảnh đại diện màu được dùng chung cho các size cùng màu.</p>}
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>{children}</label>
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block max-w-48 text-xs font-semibold leading-4 text-rose-600">{children}</span>
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <Field label={label}><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} maxLength={120} className="input" /></Field>
}

function SizeTextField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error: string }) {
  return <Field label={label}><input value={value} onChange={event => onChange(event.target.value)} maxLength={40} className={`input ${error ? 'border-rose-500' : ''}`} />{error && <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}</Field>
}

function NumberField({ label, value, onChange, error }: { label: string; value: number | undefined; onChange: (value: string) => void; error: string }) {
  return <Field label={label}><input type="number" min="0" step="0.1" value={value ?? ''} onChange={event => onChange(event.target.value)} className={`input ${error ? 'border-rose-500' : ''}`} />{error && <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}</Field>
}

function numericError(value: number | undefined, rangeMessage: string) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) return 'Nhập số không âm.'
  return rangeMessage
}
