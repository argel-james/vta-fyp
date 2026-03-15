"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"
import { useAuth } from "@/context/auth-context"
import { fetchCourses } from "@/lib/chat-service"

export default function ChatPage() {
  const { token } = useAuth()
  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const documentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prompt = searchParams.get("prompt")
    const course = searchParams.get("course")
    if (prompt) setInitialPrompt(prompt)
    if (course) setCourseId(course)
  }, [searchParams])

  useEffect(() => {
    fetchCourses(token).then((c) => {
      setCourses(c)
      if (c.length > 0 && !searchParams.get("course")) setCourseId(c[0])
    }).catch(() => {})
  }, [token, searchParams])

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
      {/* Course selector bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-2 flex items-center gap-3">
        <label className="text-xs font-semibold text-muted-foreground">Course:</label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="px-2 py-1 bg-background border border-border rounded text-foreground text-sm"
        >
          {courses.length > 0 ? (
            courses.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)
          ) : (
            <option value={courseId}>{courseId.toUpperCase()}</option>
          )}
        </select>
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
