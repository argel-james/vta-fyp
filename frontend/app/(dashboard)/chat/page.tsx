"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"

export default function ChatPage() {
  const [courseId, setCourseId] = useState("sc2107")
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const documentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prompt = searchParams.get("prompt")
    const course = searchParams.get("course")
    if (prompt) {
      setInitialPrompt(prompt)
    }
    if (course) {
      setCourseId(course)
    }
  }, [searchParams])

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col">
        <ChatInterface
          ref={documentRef}
          initialPrompt={initialPrompt}
          courseId={courseId}
        />
      </div>
    </div>
  )
}
