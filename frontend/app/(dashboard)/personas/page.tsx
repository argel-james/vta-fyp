"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { PersonaMode, SourceInfo } from "@/types"
import { askQuestion } from "@/lib/chat-service"
import { useAuth } from "@/context/auth-context"

export default function PersonasPage() {
  const searchParams = useSearchParams()
  const { token } = useAuth()
  const [selectedPersona, setSelectedPersona] = useState<PersonaMode>(
    (searchParams.get("mode") as PersonaMode) || "standard",
  )
  const [question, setQuestion] = useState("")
  const [courseId] = useState(() => searchParams.get("course") || "sc2107")
  const [hints, setHints] = useState<string[]>([])
  const [followUps, setFollowUps] = useState<string[]>([])
  const [fullAnswer, setFullAnswer] = useState("")
  const [sources, setSources] = useState<SourceInfo[]>([])
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const [showFullAnswer, setShowFullAnswer] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const personas = [
    {
      id: "standard" as PersonaMode,
      label: "Standard",
      description: "Clear, structured explanations that break down concepts step by step.",
      icon: "💬",
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    },
    {
      id: "advocate" as PersonaMode,
      label: "Devil's Advocate",
      description: "Challenges your assumptions and encourages critical thinking through opposing viewpoints.",
      icon: "🎭",
      color: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
    },
    {
      id: "joker" as PersonaMode,
      label: "Joker",
      description: "Makes learning fun with humor and memorable analogies.",
      icon: "😄",
      color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
    },
    {
      id: "socratic" as PersonaMode,
      label: "Socratic",
      description: "Guides you to discover answers yourself through thoughtful questions.",
      icon: "🤔",
      color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    },
  ]

  const summarizeTopic = (questionText: string, answer: string) => {
    if (questionText?.trim()) return questionText.trim()
    const firstSentence = answer.split(/\.|\n/)[0]?.trim()
    return firstSentence || "this topic"
  }

  const pickSourceTitle = (sourceList: SourceInfo[]) => {
    if (!sourceList?.length) return ""
    const first = sourceList[0]
    return first.file ? ` (see ${first.file}${typeof first.page === "number" ? ` p${first.page}` : ""})` : ""
  }

  const generateHints = (topic: string, persona: PersonaMode, sourceTitle: string) => {
    const contextualTopic = topic || "this topic"
    const tag = sourceTitle || ""
    const prompts = {
      standard: [
        `Restate ${contextualTopic}${tag} in one clear line using your own words.`,
        `Which prerequisite concept unlocks ${contextualTopic}?`,
        `Map the step-by-step flow of ${contextualTopic} (setup → action → result).`,
      ],
      advocate: [
        `Which assumption about ${contextualTopic}${tag} could collapse under a boundary case?`,
        `How would you argue the opposite of the common take on ${contextualTopic}?`,
        `What hard evidence would force you to change your view on ${contextualTopic}?`,
      ],
      joker: [
        `If ${contextualTopic} were a movie plot, what is the absurd twist?`,
        `What is the funniest totally-wrong take on ${contextualTopic} you can debunk?`,
        `Drop a meme-worthy analogy for ${contextualTopic} that still teaches the core idea.`,
      ],
      socratic: [
        `What do you already know that directly anchors ${contextualTopic}${tag}?`,
        `How would you teach ${contextualTopic} to a junior student with one question?`,
        `What is the next precise question that would unlock the mechanism of ${contextualTopic}?`,
      ],
    }
    return prompts[persona]
  }

  const generateFollowUps = (topic: string, persona: PersonaMode, sourceTitle: string) => {
    const stem = topic || "this concept"
    const tag = sourceTitle || ""
    const follow = {
      standard: [
        `Show a concrete use case of ${stem}${tag} and contrast it with an alternative.`,
        `Where does ${stem} break down in practice, and how do you guardrail it?`,
        `How would you explain ${stem} with a minimal working example?`,
      ],
      advocate: [
        `Build the strongest counterclaim against ${stem}${tag}; how would you rebut it?`,
        `If ${stem} failed in production, what symptom would you see first?`,
        `Which boundary conditions flip the usual intuition about ${stem}?`,
      ],
      joker: [
        `What is the most over-the-top scenario where ${stem} hilariously saves the day?`,
        `If ${stem} were a character, how would it feud with its opposite approach?`,
        `What classic rookie blunder about ${stem}${tag} always makes you smile?`,
      ],
      socratic: [
        `What is the smallest experiment you can run to validate ${stem}${tag}?`,
        `Which prior concept must be solid before ${stem} makes sense?`,
        `How would you falsify your understanding of ${stem}?`,
      ],
    }
    return follow[persona]
  }

  const handleAskQuestion = async (prompt?: string) => {
    const activeQuestion = (prompt ?? question).trim()
    if (!activeQuestion) return
    setIsLoading(true)
    setError(null)
    setFullAnswer("")
    setSources([])
    setRevealedHints([])
    setShowFullAnswer(false)

    try {
      const reply = await askQuestion({
        question: activeQuestion,
        courseId,
        token,
        persona: selectedPersona,
        learningLevel: "intermediate",
      })

      const replySources = reply.sources || []
      const topic = summarizeTopic(activeQuestion, reply.answer)
      const sourceTag = pickSourceTitle(replySources)

      setFullAnswer(reply.answer)
      setSources(replySources)
      setHints(generateHints(topic, selectedPersona, sourceTag))
      setFollowUps(generateFollowUps(topic, selectedPersona, sourceTag))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to fetch an answer right now."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const revealHint = (index: number) => {
    if (!revealedHints.includes(index)) {
      setRevealedHints([...revealedHints, index])
    }
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-6xl px-8 py-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Persona Discussions</h1>
            <p className="text-muted-foreground">
              Choose a learning persona and explore thought-provoking, step-by-step answers.
            </p>
          </div>

          {/* Persona Selector */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {personas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => {
                  setSelectedPersona(persona.id)
                  setHints([])
                  setRevealedHints([])
                  setShowFullAnswer(false)
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedPersona === persona.id
                    ? persona.color + " scale-105 shadow-lg"
                    : "bg-card border-border hover:border-primary/50 hover:scale-102"
                }`}
              >
                <div className="text-2xl mb-2">{persona.icon}</div>
                <div className="font-semibold text-foreground mb-1">{persona.label}</div>
              </button>
            ))}
          </div>

          {/* Selected Persona Description */}
          {selectedPersona && (
            <Card className="p-6 bg-card/80 backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{personas.find((p) => p.id === selectedPersona)?.icon}</span>
                <div>
                  <h2 className="font-semibold text-foreground mb-2">
                    {personas.find((p) => p.id === selectedPersona)?.label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {personas.find((p) => p.id === selectedPersona)?.description}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Question Input */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Ask Your Question</h2>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to learn about?"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              rows={3}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={() => void handleAskQuestion()}
              className="w-full sm:w-auto"
              disabled={!question.trim() || isLoading}
            >
              {isLoading ? "Thinking..." : "Get Persona Answer"}
            </Button>
          </Card>

          {/* Hints and Answer Section */}
          {hints.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Step-by-Step Guidance</h2>

              {/* Hints */}
              <div className="space-y-3">
                {hints.map((hint, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => revealHint(index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-foreground">Hint {index + 1}</div>
                        {revealedHints.includes(index) ? (
                          <p className="text-sm text-foreground mt-2">{hint}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2 italic">Click to reveal...</p>
                        )}
                      </div>
                      <span className="text-lg">{revealedHints.includes(index) ? "👁️" : "👁️‍🗨️"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Answer */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowFullAnswer(!showFullAnswer)}
                  className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 transition-colors text-left flex items-center justify-between"
                >
                  <span className="font-semibold text-foreground">Complete Answer</span>
                  <span>{showFullAnswer ? "▼" : "▶"}</span>
                </button>
                {showFullAnswer && (
                  <div className="px-4 py-4 bg-card">
                    <p className="text-sm text-foreground leading-relaxed">{fullAnswer}</p>
                    {sources.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">Sources</div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {sources.map((source, idx) => (
                            <span
                              key={`${source.file}-${source.page ?? idx}`}
                              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1"
                            >
                              <span>{source.file}</span>
                              {typeof source.page === "number" && (
                                <span className="text-[11px] text-foreground/70">p{source.page}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Follow-up questions */}
              {followUps.length > 0 && (
                <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                  <div className="text-sm font-semibold text-foreground">Follow-up prompts</div>
                  <div className="flex flex-wrap gap-2">
                    {followUps.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuestion(item)
                          void handleAskQuestion(item)
                        }}
                        className="text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-primary/10 transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
