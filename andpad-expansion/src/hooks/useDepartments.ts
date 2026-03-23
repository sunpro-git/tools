import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const BUSINESS_TYPES = ['新築', 'リフォーム', '不動産'] as const
export type BusinessType = typeof BUSINESS_TYPES[number]

export interface Department {
  id: string
  name: string
  sort_order: number
  business_type: string
}

export function useDepartments(businessType?: BusinessType) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('departments')
      .select('*')
      .order('sort_order')
      .limit(100)
    if (businessType) {
      q = q.eq('business_type', businessType)
    }
    const { data } = await q
    setDepartments((data as Department[]) || [])
    setLoading(false)
  }, [businessType])

  useEffect(() => { fetchDepartments() }, [fetchDepartments])

  const deptNames = departments.map((d) => d.name)

  return { departments, deptNames, loading, fetchDepartments }
}
