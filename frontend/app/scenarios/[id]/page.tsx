"use client"

import { useParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ScenarioPage() {
  const { theme, setTheme } = useTheme()
  const params = useParams()
  const router = useRouter()
  const scenarioId = params.id as string

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
  }

  const currentTheme: "light" | "dark" = theme === "light" ? "light" : "dark"

  // Dummy scenario data
  const scenarios: Record<
    string,
    {
      title: string
      description: string
      characters: [string, string]
      messages: Array<{ speaker: string; text: string }>
    }
  > = {
    "1": {
      title: "Peter vs Stewie on Time Complexity",
      description:
        "An entertaining debate about whether Big O notation really matters in real-world software development.",
      characters: ["Peter Griffin", "Stewie Griffin"],
      messages: [
        {
          speaker: "Peter",
          text: "Okay Stewie, I've been coding for like, five minutes now, and I gotta ask - why do we even need this Big O notation thing? My code works fine!",
        },
        {
          speaker: "Stewie",
          text: "Oh, how delightfully naive. Tell me, fat man, what happens when your 'fine' code needs to process a million records instead of ten?",
        },
        {
          speaker: "Peter",
          text: "Uh... it just takes a little longer? Like when Meg talks about her day?",
        },
        {
          speaker: "Stewie",
          text: "A 'little longer'? If you're using a nested loop, that's O(n²). With a million records, that's a TRILLION operations. Your app would crash faster than your diet plans.",
        },
        {
          speaker: "Peter",
          text: "Okay, okay, I get it. So Big O tells us how slow our code gets when we add more stuff?",
        },
        {
          speaker: "Stewie",
          text: "Precisely! It's about scalability. O(n) grows linearly, O(log n) barely grows at all, and O(n²) explodes like your cholesterol after a chicken fight. Understanding this prevents disasters.",
        },
        {
          speaker: "Peter",
          text: "Hehehehe, chicken fight. But yeah, I guess knowing if something is gonna explode before it does is pretty important.",
        },
        {
          speaker: "Stewie",
          text: "Finally, a glimmer of intelligence! Now go optimize your algorithms before I'm forced to debug your mess.",
        },
      ],
    },
    "2": {
      title: "Rick and Morty Explain Recursion",
      description: "An interdimensional journey through recursive functions and base cases.",
      characters: ["Rick", "Morty"],
      messages: [
        { speaker: "Rick", text: "Alright Morty, *burp* we're gonna talk about recursion." },
        { speaker: "Morty", text: "Oh geez Rick, isn't that when a function calls itself?" },
        {
          speaker: "Rick",
          text: "Exactly Morty! It's like looking into a portal that shows another portal. Each call creates a new universe of execution.",
        },
        { speaker: "Morty", text: "But Rick, w-wouldn't that just go on forever?" },
        {
          speaker: "Rick",
          text: "That's why you need a BASE CASE, Morty! Without it, you get infinite recursion and your program crashes harder than the Galactic Federation's economy.",
        },
      ],
    },
    "3": {
      title: "The Office: Sorting Algorithms Explained",
      description: "Michael Scott teaches the team about bubble sort, quick sort, and merge sort.",
      characters: ["Michael Scott", "Jim Halpert"],
      messages: [
        {
          speaker: "Michael",
          text: "Okay team, today we're learning about sorting algorithms. First up: Bubble Sort!",
        },
        { speaker: "Jim", text: "Michael, bubble sort is actually one of the slowest sorting algorithms." },
        { speaker: "Michael", text: "That's what makes it relatable, Jim! It tries its best, just like me." },
        {
          speaker: "Jim",
          text: "Sure. And quick sort is like when you actually do things efficiently - divide and conquer.",
        },
        { speaker: "Michael", text: "Exactly! That's what I do. I divide the work and conquer... snack time." },
      ],
    },
  }

  const scenario = scenarios[scenarioId] || scenarios["1"]

  const handleStartSimilarDiscussion = () => {
    router.push(`/chat?prompt=${encodeURIComponent(`Let's discuss: ${scenario.title}`)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <Navbar theme={currentTheme} onToggleTheme={toggleTheme} userRole="student" />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{scenario.title}</h1>
          <p className="text-muted-foreground">{scenario.description}</p>
          <div className="flex gap-2 flex-wrap">
            {scenario.characters.map((char) => (
              <span key={char} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <Card className="p-6 space-y-4">
          {scenario.messages.map((message, index) => {
            const isFirstCharacter = message.speaker === scenario.characters[0]
            return (
              <div key={index} className={`flex ${isFirstCharacter ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] ${
                    isFirstCharacter
                      ? "bg-secondary/50 rounded-lg rounded-tl-none"
                      : "bg-primary/10 rounded-lg rounded-tr-none"
                  }`}
                >
                  <div className="px-4 py-2 border-b border-border/50">
                    <span className="font-semibold text-sm text-foreground">{message.speaker}</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-foreground leading-relaxed">{message.text}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </Card>

        {/* Call to Action */}
        <Card className="p-6 text-center space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Want to explore this topic further?</h3>
          <p className="text-sm text-muted-foreground">
            Start a similar discussion with the assistant using your course materials.
          </p>
          <Button onClick={handleStartSimilarDiscussion} size="lg">
            Start a similar discussion
          </Button>
        </Card>
      </main>
    </div>
  )
}
