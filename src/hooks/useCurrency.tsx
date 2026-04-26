import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type CurrencyCode = 'SAR' | 'PHP' | 'USD';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatCurrency: (n: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('SAR');

  useEffect(() => {
    const saved = localStorage.getItem('lggm.currency');
    if (saved && ['SAR', 'PHP', 'USD'].includes(saved)) {
      setCurrencyState(saved as CurrencyCode);
    }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem('lggm.currency', c);
  };

  const formatCurrency = (n: number) => {
    let locale = 'en-SA';
    if (currency === 'PHP') locale = 'en-PH';
    if (currency === 'USD') locale = 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return ctx;
}
