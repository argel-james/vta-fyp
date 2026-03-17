"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

const interactiveFeatures = [
  {
    icon: "🧙‍♂️",
    label: "Socratic Tutor",
    href: "/socratic",
    description: "Guided questioning that helps you discover answers on your own.",
    color: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: "🎓",
    label: "Teach-It-Back",
    href: "/teach-back",
    description: "Explain concepts back to the AI to solidify your understanding.",
    color: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: "🗺️",
    label: "Concept Map",
    href: "/concept-map",
    description: "Visualise how topics connect with interactive concept maps.",
    color: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: "🎮",
    label: "Scenarios",
    href: "/scenarios",
    description: "Apply knowledge through realistic, branching scenario challenges.",
    color: "bg-orange-500/10 border-orange-500/20",
  },
  {
    icon: "🎨",
    label: "Picture Cards",
    href: "/illustrated",
    description: "Visual flashcards with AI-generated illustrations for memory.",
    color: "bg-pink-500/10 border-pink-500/20",
  },
  {
    icon: "📓",
    label: "Mistake Journal",
    href: "/revision",
    description: "Review past mistakes and get targeted revision material.",
    color: "bg-amber-500/10 border-amber-500/20",
  },
]

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
        <main className="w-full max-w-6xl px-4 sm:px-8 py-6 sm:py-8 space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="text-muted-foreground">GenAI Virtual Classroom</p>
            <p className="text-sm text-muted-foreground">Explore, learn, and play with AI-powered tools.</p>
          </div>

          {/* Main Cards */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {/* Chat with Assistant */}
            <Card className="p-5 sm:p-6 space-y-4 hover:shadow-lg transition-shadow">
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
            <Card className="p-5 sm:p-6 space-y-4 hover:shadow-lg transition-shadow">
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
            <Card className="p-5 sm:p-6 space-y-4 hover:shadow-lg transition-shadow border-2 border-dashed border-primary/30">
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

          {/* Interactive Features */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Interactive</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Deep-learning tools that go beyond Q&A.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {interactiveFeatures.map((feature) => (
                <Link key={feature.href} href={feature.href} className="group">
                  <Card
                    className={`p-4 sm:p-5 h-full border transition-all hover:shadow-md hover:-translate-y-0.5 ${feature.color}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0 mt-0.5">{feature.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {feature.label}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0 mt-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
