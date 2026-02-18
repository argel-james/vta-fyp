"use client"

import React, { useState } from "react"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { SettingsModal } from "@/components/settings-modal"
import { AuthGuard } from "@/components/auth-guard"
import { PageTransitionWrapper } from "@/components/page-transition-wrapper"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [learningLevel, setLearningLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate")
  const [responseSpeed, setResponseSpeed] = useState(50)

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
  }

  const currentTheme: "light" | "dark" = theme === "light" ? "light" : "dark"

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Navbar - Persistent across all dashboard pages */}
        <Navbar 
          theme={currentTheme} 
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Persistent across all dashboard pages */}
          <Sidebar isOpen={sidebarOpen} onSettingsClick={() => setSettingsOpen(true)} />

          {/* Page Content - Changes based on route with smooth transitions */}
          <PageTransitionWrapper>
            <div className="flex-1 flex flex-col overflow-hidden">
              {children}
            </div>
          </PageTransitionWrapper>
        </div>

        {/* Settings Modal - Accessible from anywhere */}
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
