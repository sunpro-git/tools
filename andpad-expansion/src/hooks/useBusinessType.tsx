import { createContext, useContext, useState, type ReactNode } from 'react'
import type { BusinessType } from './useDepartments'

interface BusinessTypeContextValue {
  businessType: BusinessType
  setBusinessType: (bt: BusinessType) => void
}

const BusinessTypeContext = createContext<BusinessTypeContextValue>({
  businessType: '新築',
  setBusinessType: () => {},
})

export function BusinessTypeProvider({ children }: { children: ReactNode }) {
  const [businessType, setBusinessType] = useState<BusinessType>(() => {
    try {
      const saved = localStorage.getItem('businessType')
      if (saved === '新築' || saved === 'リフォーム' || saved === '不動産') return saved
    } catch { /* */ }
    return '新築'
  })

  const setBT = (bt: BusinessType) => {
    setBusinessType(bt)
    localStorage.setItem('businessType', bt)
  }

  return (
    <BusinessTypeContext.Provider value={{ businessType, setBusinessType: setBT }}>
      {children}
    </BusinessTypeContext.Provider>
  )
}

export function useBusinessType() {
  return useContext(BusinessTypeContext)
}
