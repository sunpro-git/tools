import { createContext, useContext, useState, type ReactNode } from 'react'

function getCurrentSnYear(): number {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 9 ? y + 1 : y
}

interface FiscalYearContextValue {
  snYear: number
  setSnYear: (y: number) => void
  fiscalFrom: string
  fiscalTo: string
}

const FiscalYearContext = createContext<FiscalYearContextValue>({
  snYear: getCurrentSnYear(),
  setSnYear: () => {},
  fiscalFrom: '',
  fiscalTo: '',
})

export function FiscalYearProvider({ children }: { children: ReactNode }) {
  const [snYear, setSnYear] = useState(getCurrentSnYear)

  const fiscalFrom = `${snYear - 1}-09-01`
  const fiscalTo = `${snYear}-08-31`

  return (
    <FiscalYearContext.Provider value={{ snYear, setSnYear, fiscalFrom, fiscalTo }}>
      {children}
    </FiscalYearContext.Provider>
  )
}

export function useFiscalYear() {
  return useContext(FiscalYearContext)
}
