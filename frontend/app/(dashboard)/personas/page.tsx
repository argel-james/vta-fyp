"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { PersonaMode, SourceInfo } from "@/types"
import { askQuestion, fetchCourses } from "@/lib/chat-service"
import { useAuth } from "@/context/auth-context"

interface ConversationTurn {
  role: "user" | "assistant"
  content: string
  persona: PersonaMode
  sources?: SourceInfo[]
}

const PERSONAS = [
  {
    id: "standard" as PersonaMode,
    label: "Standard Tutor",
    description: "Clear, structured explanations that break down concepts step by step.",
    icon: "🎓",
    activeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 ring-2 ring-blue-500/20",
  },
  {
    id: "advocate" as PersonaMode,
    label: "Devil's Advocate",
    description: "Challenges your assumptions and pushes you to defend your reasoning.",
    icon: "🎭",
    activeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40 ring-2 ring-red-500/20",
  },
  {
    id: "joker" as PersonaMode,
    label: "The Joker",
    description: "Makes learning memorable with humour, analogies, and creative storytelling.",
    icon: "😄",
    activeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/40 ring-2 ring-yellow-500/20",
  },
  {
    id: "socratic" as PersonaMode,
    label: "Socratic Guide",
    description: "Guides you to discover answers yourself through a series of focused questions.",
    icon: "🤔",
    activeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40 ring-2 ring-purple-500/20",
  },
]

const STARTER_PROMPTS: Record<PersonaMode, string[]> = {
  standard: [
    "Walk me through the main concepts from this week",
    "Can you explain how the key algorithm works?",
    "What are the most important takeaways for the exam?",
  ],
  advocate: [
    "Is the approach in the lecture really the best one?",
    "What are the weaknesses of this theory?",
    "Play devil's advocate on my understanding of the topic",
  ],
  joker: [
    "Explain the hardest topic like I'm five — make it funny",
    "Give me a meme-worthy way to remember the key formula",
    "What's the most ridiculous analogy for how this system works?",
  ],
  socratic: [
    "Help me figure out why my solution approach is wrong",
    "I think I understand the concept — test me",
    "Guide me through solving this type of problem",
  ],
}

export default function PersonasPage() {
  const searchParams = useSearchParams()
  const { token } = useAuth()

  const [selectedPersona, setSelectedPersona] = useState<PersonaMode>(
    (searchParams.get("mode") as PersonaMode) || "standard",
  )
  const [courseId, setCourseId] = useState(() => searchParams.get("course") || "sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [learningLevel, setLearningLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate")

  const [question, setQuestion] = useState("")
  const [conversation, setConversation] = useState<ConversationTurn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conversationEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCourses(token)
      .then((c) => {
        setCourses(c)
        if (c.length > 0 && !searchParams.get("course")) setCourseId(c[0])
      })
      .catch(() => {})
  }, [token, searchParams])

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation])

  const handleAsk = async (prompt?: string) => {
    const activeQuestion = (prompt ?? question).trim()
    if (!activeQuestion) return

    setIsLoading(true)
    setError(null)

    const userTurn: ConversationTurn = {
      role: "user",
      content: activeQuestion,
      persona: selectedPersona,
    }
    setConversation((prev) => [...prev, userTurn])
    if (!prompt) setQuestion("")

    try {
      const history = conversation.map((t) => ({ role: t.role, content: t.content }))

      const reply = await askQuestion({
        question: activeQuestion,
        courseId,
        token,
        persona: selectedPersona,
        learningLevel,
        history,
      })

      const assistantTurn: ConversationTurn = {
        role: "assistant",
        content: reply.answer,
        persona: selectedPersona,
        sources: reply.sources,
      }
      setConversation((prev) => [...prev, assistantTurn])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to fetch an answer right now."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewTopic = () => {
    setConversation([])
    setQuestion("")
    setError(null)
  }

  const activePersona = PERSONAS.find((p) => p.id === selectedPersona)!
  const starters = STARTER_PROMPTS[selectedPersona]

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-4xl px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">Persona Discussions</h1>
              <p className="text-sm text-muted-foreground">
                Pick a learning persona and explore any topic in depth with guided conversation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Level</label>
                <select
                  value={learningLevel}
                  onChange={(e) => setLearningLevel(e.target.value as typeof learningLevel)}
                  className="px-2 py-1.5 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="px-2 py-1.5 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  {courses.length > 0
                    ? courses.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      ))
                    : <option value={courseId}>{courseId.toUpperCase()}</option>}
                </select>
              </div>
            </div>
          </div>

          {/* Persona Selector */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PERSONAS.map((persona) => (
              <button
                key={persona.id}
                onClick={() => {
                  setSelectedPersona(persona.id)
                  if (conversation.length === 0) setQuestion("")
                }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPersona === persona.id
                    ? persona.activeClass + " scale-[1.02] shadow-md"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="text-2xl mb-2">{persona.icon}</div>
                <div className="font-semibold text-sm text-foreground">{persona.label}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{persona.description}</p>
              </button>
            ))}
          </div>

          {/* Conversation area */}
          {conversation.length > 0 ? (
            <Card className="p-0 overflow-hidden">
              {/* Conversation header */}
              <div className="px-5 py-3 border-b border-border bg-card/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activePersona.icon}</span>
                  <span className="font-semibold text-sm text-foreground">{activePersona.label}</span>
                  <span className="text-xs text-muted-foreground">
                    — {conversation.filter((t) => t.role === "user").length} exchange{conversation.filter((t) => t.role === "user").length !== 1 ? "s" : ""}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleNewTopic} className="text-xs">
                  New topic
                </Button>
              </div>

              {/* Messages */}
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-4">
                {conversation.map((turn, idx) => (
                  <div key={idx} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        turn.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary/50 border border-border text-foreground rounded-bl-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{turn.content}</div>
                      {turn.sources && turn.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                          {turn.sources.map((s, si) => (
                            <span key={si} className="bg-muted px-2 py-0.5 rounded">
                              {s.file}
                              {typeof s.page === "number" && <span className="ml-1 opacity-70">p{s.page}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary/50 border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={conversationEndRef} />
              </div>

              {/* Follow-up input */}
              <div className="border-t border-border px-5 py-3 bg-card/50">
                {error && <p className="text-sm text-destructive mb-2">{error}</p>}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleAsk()
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Follow up or ask another question…"
                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={!question.trim() || isLoading} size="sm">
                    {isLoading ? "Thinking…" : "Send"}
                  </Button>
                </form>
              </div>
            </Card>
          ) : (
            /* Initial question card + starters */
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activePersona.icon}</span>
                <div>
                  <h2 className="font-semibold text-foreground">{activePersona.label}</h2>
                  <p className="text-sm text-muted-foreground">{activePersona.description}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  What would you like to explore?
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type your question or pick a starter below…"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none text-sm"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void handleAsk()
                    }
                  }}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                onClick={() => void handleAsk()}
                className="w-full sm:w-auto"
                disabled={!question.trim() || isLoading}
              >
                {isLoading ? "Thinking…" : "Start Discussion"}
              </Button>

              {/* Starter prompts */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Or try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuestion(s)
                        void handleAsk(s)
                      }}
                      className="text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-primary/10 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
