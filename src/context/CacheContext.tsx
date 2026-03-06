import React, { createContext, useContext, useState, useCallback } from 'react';

interface CacheContextType {
  data: Record<string, any>;
  setCache: (key: string, value: any) => void;
  getCache: (key: string) => any;
  clearCache: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<Record<string, any>>({});

  const setCache = useCallback((key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: { value, timestamp: Date.now() } }));
  }, []);

  const getCache = useCallback((key: string) => {
    const cachedItem = data[key];
    // Cache expires after 15 minutes (900000 ms)
    if (cachedItem && Date.now() - cachedItem.timestamp < 900000) {
      return cachedItem.value;
    }
    return null;
  }, [data]);

  const clearCache = useCallback(() => {
    setData({});
  }, []);

  return (
    <CacheContext.Provider value={{ data, setCache, getCache, clearCache }}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};
