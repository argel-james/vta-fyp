"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { SettingsModal } from "@/components/settings-modal"

export default function ChatPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [learningLevel, setLearningLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate")
  const [responseSpeed, setResponseSpeed] = useState(50)
  const searchParams = useSearchParams()
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null)
  const documentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const htmlElement = document.documentElement
    if (theme === "dark") {
      htmlElement.classList.add("dark")
    } else {
      htmlElement.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) {
      setInitialPrompt(prompt)
    }
  }, [searchParams])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Navbar */}
      <Navbar theme={theme} onToggleTheme={toggleTheme} userRole="student" />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onSettingsClick={() => setSettingsOpen(true)} />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Menu Toggle */}
          <div className="lg:hidden border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <ChatInterface
            ref={documentRef}
            learningLevel={learningLevel}
            responseSpeed={responseSpeed}
            initialPrompt={initialPrompt}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        learningLevel={learningLevel}
        onLearningLevelChange={setLearningLevel}
        responseSpeed={responseSpeed}
        onResponseSpeedChange={setResponseSpeed}
      />
    </div>
  )
}
