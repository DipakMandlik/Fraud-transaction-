import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { demoApi } from "@/lib/api";

interface DemoModeContextValue {
  enabled: boolean;
  toggle: () => void;
  loading: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data } = useQuery({ queryKey: ["demo-mode"], queryFn: demoApi.getMode, staleTime: Infinity });

  useEffect(() => {
    if (data) setEnabled(data.demo_mode);
  }, [data]);

  async function toggle() {
    setLoading(true);
    try {
      const result = await demoApi.setMode(!enabled);
      setEnabled(result.demo_mode);
    } finally {
      setLoading(false);
    }
  }

  return <DemoModeContext.Provider value={{ enabled, toggle, loading }}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
