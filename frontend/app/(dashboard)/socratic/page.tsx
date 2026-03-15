"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useVisualTheme } from "@/context/visual-theme-context"
import { socraticTutor, fetchCourses } from "@/lib/chat-service"
import { VoiceChat } from "@/components/voice-chat"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function SocraticPage() {
  const { token } = useAuth()
  const { visualTheme } = useVisualTheme()
  const isPlayful = visualTheme === "playful"

  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [topic, setTopic] = useState("")
  const [level, setLevel] = useState("intermediate")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCourses(token).then(setCourses).catch(() => {})
  }, [token])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || !topic.trim()) return
    setInput("")
    const userMsg: Message = { role: "user", content: msg }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setLoading(true)
    setStarted(true)

    try {
      const result = await socraticTutor(courseId, topic, msg, newHistory, level, token)
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }])
      setProgress(result.metadata?.progress ?? progress)
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again!" }])
    } finally {
      setLoading(false)
    }
  }, [input, messages, courseId, topic, level, token, progress])

  const starters = [
    `What is ${topic || "this concept"} and why does it matter?`,
    `Can you help me understand ${topic || "the basics"}?`,
    `I'm confused about ${topic || "this topic"} — where do I start?`,
  ]

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-indigo-500/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-3xl px-6 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className={`text-3xl font-bold text-foreground ${isPlayful ? "tracking-wide" : ""}`}>
              {isPlayful ? "🧙‍♂️ Socratic Discovery" : "Socratic Tutor"}
            </h1>
            <p className="text-muted-foreground">
              I won&apos;t give you the answer — I&apos;ll guide you to discover it yourself.
            </p>
          </div>

          {/* Setup */}
          <Card className="p-5 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Course</label>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                  {courses.length > 0 ? courses.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  )) : <option value={courseId}>{courseId.toUpperCase()}</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Topic *</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Recursion..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Progress bar */}
          {started && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Understanding Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Conversation */}
          <div className="space-y-4 min-h-[200px]">
            {messages.length === 0 && topic.trim() && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Get started with a question:</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((s, i) => (
                    <button key={i} onClick={() => void handleSend(s)}
                      className="px-4 py-2 text-sm bg-secondary/50 hover:bg-secondary text-foreground rounded-full transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : isPlayful
                      ? "bg-indigo-500/10 border border-indigo-500/20 text-foreground rounded-bl-md"
                      : "bg-secondary/60 text-foreground rounded-bl-md"
                }`}>
                  {msg.role === "assistant" && isPlayful && <span className="mr-1">🧙‍♂️</span>}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 bg-secondary/60 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.15s]" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="sticky bottom-4">
            <div className="flex gap-2 items-end">
              <input type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void handleSend()}
                placeholder={topic.trim() ? "Share your thoughts or answer..." : "Enter a topic above first"}
                disabled={!topic.trim() || loading}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm disabled:opacity-50" />
              <VoiceChat
                onTranscription={(text) => { if (text) void handleSend(text) }}
                textToRead={messages.length > 0 ? messages[messages.length - 1]?.content : undefined}
                token={token}
                compact
              />
              <Button onClick={() => void handleSend()} disabled={!input.trim() || !topic.trim() || loading}
                className="px-6">
                Send
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
