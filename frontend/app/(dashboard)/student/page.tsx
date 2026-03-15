"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export default function StudentLandingPage() {
  const { user } = useAuth()

  const personas = [
    { id: "standard", label: "Standard", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
    { id: "advocate", label: "Devil's Advocate", color: "bg-red-500/10 text-red-700 dark:text-red-300" },
    { id: "joker", label: "Joker", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" },
    { id: "socratic", label: "Socratic", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  ]

  return (
    <div className="flex-1 w-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-6xl px-8 py-8 space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="text-muted-foreground">GenAI Virtual Classroom</p>
            <p className="text-sm text-muted-foreground">Explore, learn, and play with AI-powered tools.</p>
          </div>

          {/* Main Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Chat with Assistant */}
            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Chat with Assistant</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask questions and get answers powered by RAG through your course materials.
                  </p>
                  <Link href="/chat">
                    <Button className="w-full sm:w-auto">Open Chat</Button>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Creative Discussions */}
            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Persona Discussions</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Learn through personas that challenge your thinking.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {personas.map((persona) => (
                      <Link key={persona.id} href={`/personas?mode=${persona.id}`}>
                        <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 ${persona.color}`}>
                          {persona.label}
                        </button>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Learn & Play */}
            <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow border-2 border-dashed border-primary/30">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🎮</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Learn & Play</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Flashcards, quizzes, and Duolingo-style games generated from your course content.
                  </p>
                  <Link href="/learn">
                    <Button variant="outline" className="w-full sm:w-auto">Start Learning</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
