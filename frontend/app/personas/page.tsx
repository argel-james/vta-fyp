"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import type { PersonaMode } from "@/types"

export default function PersonasPage() {
  const { theme, setTheme } = useTheme()
  const searchParams = useSearchParams()
  const [selectedPersona, setSelectedPersona] = useState<PersonaMode>(
    (searchParams.get("mode") as PersonaMode) || "standard",
  )
  const [question, setQuestion] = useState("")
  const [hints, setHints] = useState<string[]>([])
  const [fullAnswer, setFullAnswer] = useState("")
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const [showFullAnswer, setShowFullAnswer] = useState(false)

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
  }

  const currentTheme: "light" | "dark" = theme === "light" ? "light" : "dark"

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

  const handleAskQuestion = () => {
    if (!question.trim()) return

    // Dummy hints based on persona
    const dummyHints = {
      standard: [
        "Think about the fundamental definition of this concept.",
        "Consider how this relates to similar problems you've solved.",
        "Break the problem down into smaller, manageable steps.",
      ],
      advocate: [
        "What assumptions are you making here?",
        "Can you think of a scenario where the opposite might be true?",
        "How would you defend the counterargument?",
      ],
      joker: [
        "Here's a fun way to remember this: imagine a pizza...",
        "Plot twist: what if I told you most people get this backwards?",
        "Let me give you a ridiculous but memorable example...",
      ],
      socratic: [
        "What do you already know about this topic?",
        "How would you explain this to someone younger?",
        "What question would you ask yourself to get closer to the answer?",
      ],
    }

    setHints(dummyHints[selectedPersona])
    setFullAnswer(
      "This is where the complete, detailed answer would appear. In the real implementation, this would be fetched from your RAG backend API based on the course materials and the selected persona mode.",
    )
    setRevealedHints([])
    setShowFullAnswer(false)
  }

  const revealHint = (index: number) => {
    if (!revealedHints.includes(index)) {
      setRevealedHints([...revealedHints, index])
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <Navbar theme={currentTheme} onToggleTheme={toggleTheme} />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
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
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  {personas.find((p) => p.id === selectedPersona)?.label}
                </h3>
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
          <Button onClick={handleAskQuestion} className="w-full sm:w-auto" disabled={!question.trim()}>
            Get Answer
          </Button>
        </Card>

        {/* Hints and Answer Section */}
        {hints.length > 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Step-by-Step Guidance</h2>

            {/* Hints */}
            <div className="space-y-3">
              {hints.map((hint, index) => (
                <div key={index} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => revealHint(index)}
                    className="w-full px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left flex items-center justify-between"
                  >
                    <span className="font-medium text-foreground">Hint {index + 1}</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${revealedHints.includes(index) ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {revealedHints.includes(index) && (
                    <div className="px-4 py-3 bg-card">
                      <p className="text-sm text-muted-foreground">{hint}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Full Answer */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowFullAnswer(!showFullAnswer)}
                className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 transition-colors text-left flex items-center justify-between"
              >
                <span className="font-medium text-primary">Reveal Full Answer</span>
                <svg
                  className={`w-5 h-5 transition-transform ${showFullAnswer ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showFullAnswer && (
                <div className="px-4 py-4 bg-card">
                  <p className="text-sm text-foreground leading-relaxed">{fullAnswer}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>
      </div>
    </AuthGuard>
  )
}
