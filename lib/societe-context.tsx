'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Societe } from '@/lib/types';

interface SocieteContextType {
  societes: Societe[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  loading: boolean;
}

const SocieteContext = createContext<SocieteContextType>({
  societes: [],
  selectedId: null,
  setSelectedId: () => {},
  loading: true,
});

const STORAGE_KEY = 'daf-selected-societe';

export function SocieteProvider({ children }: { children: ReactNode }) {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function setSelectedId(id: string) {
    setSelectedIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }

  useEffect(() => {
    async function fetchSocietes() {
      const { data } = await supabase
        .from('societes')
        .select('*')
        .order('nom', { ascending: true });
      if (data && data.length > 0) {
        setSocietes(data);
        const saved = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
        const valid = saved && data.some((s) => s.id === saved);
        setSelectedIdState(valid ? saved : data[0].id);
      }
      setLoading(false);
    }
    fetchSocietes();
  }, []);

  return (
    <SocieteContext.Provider value={{ societes, selectedId, setSelectedId, loading }}>
      {children}
    </SocieteContext.Provider>
  );
}

export function useSociete() {
  return useContext(SocieteContext);
}
