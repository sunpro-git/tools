import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

type StaffOrder = { category: string; staff_name: string; sort_order: number; hidden: boolean }

interface StaffSelectorProps {
  category: string
  value: string
  onChange: (name: string) => void
  allStaffNames: string[]
}

export default function StaffSelector({ category, value, onChange, allStaffNames }: StaffSelectorProps) {
  const [orderData, setOrderData] = useState<StaffOrder[]>([])
  const [editMode, setEditMode] = useState(false)
  const [customInput, setCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [addingStaff, setAddingStaff] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const dragRef = useRef<{ idx: number } | null>(null)

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from('staff_display_order').select('category,staff_name,sort_order,hidden')
    if (data) setOrderData(data)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const staffList = useMemo(() => {
    const orders = orderData.filter(o => o.category === category)
    const orderMap = new Map(orders.map(o => [o.staff_name, o]))
    const hiddenSet = new Set(orders.filter(o => o.hidden).map(o => o.staff_name))
    const ordered = orders.filter(o => !o.hidden).sort((a, b) => a.sort_order - b.sort_order).map(o => o.staff_name)
    const unregistered = allStaffNames.filter(s => !orderMap.has(s) && !hiddenSet.has(s))
    return [...ordered, ...unregistered]
  }, [orderData, category, allStaffNames])

  // 初期表示時に、valueがリストにないなら自由入力モード
  useEffect(() => {
    if (value && !staffList.includes(value)) {
      setCustomInput(true)
      setCustomValue(value)
    } else {
      setCustomInput(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const upsertOrder = async (staffName: string, patch: Partial<StaffOrder>) => {
    await supabase.from('staff_display_order').upsert(
      { category, staff_name: staffName, ...patch },
      { onConflict: 'category,staff_name' }
    )
    fetchOrders()
  }

  const reorder = async (newList: string[]) => {
    const rows = newList.map((name, i) => ({ category, staff_name: name, sort_order: i, hidden: false }))
    await supabase.from('staff_display_order').upsert(rows, { onConflict: 'category,staff_name' })
    fetchOrders()
  }

  const handleDrop = (targetIdx: number) => {
    if (!editMode || !dragRef.current || dragRef.current.idx === targetIdx) return
    const list = [...staffList]
    const [moved] = list.splice(dragRef.current.idx, 1)
    list.splice(targetIdx, 0, moved)
    reorder(list)
    dragRef.current = null
  }

  if (customInput) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs font-medium text-slate-700">対応者</label>
        </div>
        <div className="flex gap-1.5 items-center">
          <input
            type="text"
            value={customValue}
            onChange={(e) => { setCustomValue(e.target.value); onChange(e.target.value) }}
            placeholder="氏名を入力"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            autoFocus
          />
          <button type="button" onClick={() => { setCustomInput(false); onChange('') }} className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap">戻る</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-xs font-medium text-slate-700">対応者</label>
        <button type="button" onClick={() => setEditMode(m => !m)} className="text-[10px] text-slate-400 hover:text-blue-600">{editMode ? '完了' : '編集'}</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {staffList.map((s, i) => (
          <div
            key={s}
            className="relative"
            draggable={editMode}
            onDragStart={() => { dragRef.current = { idx: i } }}
            onDragOver={(e) => { if (editMode) e.preventDefault() }}
            onDrop={() => handleDrop(i)}
          >
            <button
              type="button"
              onClick={() => { if (!editMode) onChange(value === s ? '' : s) }}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                editMode ? 'cursor-grab active:cursor-grabbing border-dashed border-slate-400' : ''
              } ${value === s && !editMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              {editMode && <span className="mr-1 text-slate-400">⠿</span>}{s}
            </button>
            {editMode && (
              <button
                type="button"
                onClick={() => upsertOrder(s, { hidden: true, sort_order: 999 })}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center hover:bg-red-600 leading-none"
              >✕</button>
            )}
          </div>
        ))}
        {editMode ? (
          addingStaff ? (
            <div className="flex gap-1 items-center">
              <input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newStaffName.trim()) {
                    e.preventDefault()
                    const name = newStaffName.trim()
                    upsertOrder(name, { sort_order: staffList.length, hidden: false })
                    setNewStaffName('')
                    setAddingStaff(false)
                  }
                }}
                placeholder="氏名を入力"
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs w-28"
                autoFocus
              />
              <button type="button" onClick={() => {
                if (newStaffName.trim()) {
                  upsertOrder(newStaffName.trim(), { sort_order: staffList.length, hidden: false })
                  setNewStaffName('')
                }
                setAddingStaff(false)
              }} className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">追加</button>
              <button type="button" onClick={() => { setAddingStaff(false); setNewStaffName('') }} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingStaff(true)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-dashed border-green-400 text-green-600 hover:bg-green-50"
            >+ 追加</button>
          )
        ) : (
          <button
            type="button"
            onClick={() => { setCustomInput(true); setCustomValue(''); onChange('') }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-dashed border-slate-400 text-slate-500 hover:bg-slate-50"
          >その他</button>
        )}
      </div>
    </div>
  )
}
