"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"

export default function StudentLandingPage() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
  }

  const currentTheme: "light" | "dark" = theme === "light" ? "light" : "dark"

  const personas = [
    { id: "standard", label: "Standard", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
    { id: "advocate", label: "Devil's Advocate", color: "bg-red-500/10 text-red-700 dark:text-red-300" },
    { id: "joker", label: "Joker", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" },
    { id: "socratic", label: "Socratic", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  ]

  const featuredConversations = [
    {
      id: "1",
      title: "Peter vs Stewie on Time Complexity",
      snippet: "A hilarious debate on whether Big O notation really matters in real-world applications...",
    },
    {
      id: "2",
      title: "Rick and Morty Explain Recursion",
      snippet: "An interdimensional journey through recursive functions and base cases...",
    },
    {
      id: "3",
      title: "The Office: Sorting Algorithms Explained",
      snippet: "Michael Scott teaches the team about bubble sort, quick sort, and why merge sort is actually...",
    },
  ]

  return (
    <AuthGuard roles={["student"]}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <Navbar theme={currentTheme} onToggleTheme={toggleTheme} />

        <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome back, Student</h1>
          <p className="text-muted-foreground">CS101: Introduction to Computer Science</p>
          <p className="text-sm text-muted-foreground">You have 3 new materials this week.</p>
        </div>

        {/* Main Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Chat with Assistant Card */}
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground mb-2">Chat with Assistant</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask questions and get answers powered by RAG through your course materials including lecture notes,
                  assignments, and textbooks.
                </p>
                <Link href="/chat">
                  <Button className="w-full sm:w-auto">Open Chat</Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Creative Discussions Card */}
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground mb-2">Creative Discussions</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn through different personas that challenge your thinking and make education more engaging.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {personas.map((persona) => (
                    <Link key={persona.id} href={`/personas?mode=${persona.id}`}>
                      <button
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 ${persona.color}`}
                      >
                        {persona.label}
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Featured Conversations */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Featured Conversations</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {featuredConversations.map((convo) => (
              <Card key={convo.id} className="p-5 space-y-3 hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-foreground line-clamp-2">{convo.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">{convo.snippet}</p>
                <Link href={`/scenarios/${convo.id}`}>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    View conversation
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
        </main>
      </div>
    </AuthGuard>
  )
}
