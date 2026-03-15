"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { VisualTheme } from "@/types"

interface VisualThemeContextValue {
  visualTheme: VisualTheme
  setVisualTheme: (theme: VisualTheme) => void
}

const STORAGE_KEY = "gvc.visual-theme"
const VisualThemeContext = createContext<VisualThemeContextValue | undefined>(undefined)

export function VisualThemeProvider({ children }: { children: React.ReactNode }) {
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>("professional")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "playful" || stored === "professional" || stored === "classic") {
      setVisualThemeState(stored)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.visualTheme = visualTheme
  }, [visualTheme])

  const setVisualTheme = useCallback((theme: VisualTheme) => {
    setVisualThemeState(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [])

  const value = useMemo(() => ({ visualTheme, setVisualTheme }), [visualTheme, setVisualTheme])

  return <VisualThemeContext.Provider value={value}>{children}</VisualThemeContext.Provider>
}

export function useVisualTheme() {
  const ctx = useContext(VisualThemeContext)
  if (!ctx) throw new Error("useVisualTheme must be used within VisualThemeProvider")
  return ctx
}
