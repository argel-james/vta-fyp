"use client"

import React from "react"
import { useTheme } from "next-themes"
import { ThemeToggle } from "@/components/theme-toggle"

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
  }

  const currentTheme: "light" | "dark" = theme === "light" ? "light" : "dark"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex flex-col">
      {/* Minimal navbar with only theme toggle */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4 flex justify-end">
        <ThemeToggle theme={currentTheme} onToggle={toggleTheme} />
      </div>

      {/* Auth content */}
      <div className="flex-1 flex items-center justify-center">{children}</div>
    </div>
  )
}
