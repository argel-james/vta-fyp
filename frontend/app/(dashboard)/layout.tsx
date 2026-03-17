"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { SettingsModal } from "@/components/settings-modal"
import { AuthGuard } from "@/components/auth-guard"
import { PageTransitionWrapper } from "@/components/page-transition-wrapper"

const LG_BREAKPOINT = 1024

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`)
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches)
    onChange(mql)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [learningLevel, setLearningLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate")
  const [responseSpeed, setResponseSpeed] = useState(50)

  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
  }

  const currentTheme: "light" | "dark" = theme === "light" ? "light" : "dark"

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-background text-foreground">
        <Navbar 
          theme={currentTheme} 
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex flex-1 overflow-hidden w-full">
          <Sidebar
            isOpen={sidebarOpen}
            isMobile={isMobile}
            onClose={closeSidebar}
            onSettingsClick={() => setSettingsOpen(true)}
          />

          <PageTransitionWrapper>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {children}
            </div>
          </PageTransitionWrapper>
        </div>

        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          learningLevel={learningLevel}
          onLearningLevelChange={setLearningLevel}
          responseSpeed={responseSpeed}
          onResponseSpeedChange={setResponseSpeed}
        />
      </div>
    </AuthGuard>
  )
}
