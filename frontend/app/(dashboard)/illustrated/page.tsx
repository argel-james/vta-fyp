"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useVisualTheme } from "@/context/visual-theme-context"
import { fetchIllustratedFlashcards, fetchCourses, type IllustratedFlashcard } from "@/lib/chat-service"
import { VoiceChat } from "@/components/voice-chat"

export default function IllustratedFlashcardsPage() {
  const { token } = useAuth()
  const { visualTheme } = useVisualTheme()
  const isPlayful = visualTheme === "playful"

  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<IllustratedFlashcard[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    fetchCourses(token).then(setCourses).catch(() => {})
  }, [token])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setCards([])
    setCardIndex(0)
    setFlipped(false)
    try {
      const result = await fetchIllustratedFlashcards(courseId, topic || undefined, 5, token)
      setCards(result)
    } catch {
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, token])

  const current = cards[cardIndex]

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-pink-500/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-3xl px-6 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className={`text-3xl font-bold text-foreground ${isPlayful ? "tracking-wide" : ""}`}>
              {isPlayful ? "🎨 Picture Cards" : "Illustrated Flashcards"}
            </h1>
            <p className="text-muted-foreground">
              AI-generated flashcards with visual illustrations to help you remember concepts.
            </p>
          </div>

          {/* Controls */}
          {cards.length === 0 && (
            <Card className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-semibold text-foreground mb-1">Topic (optional)</label>
                  <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Solar System, Sorting Algorithms..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                </div>
              </div>
              <Button onClick={() => void handleGenerate()} disabled={loading} className="w-full">
                {loading ? "Generating illustrated cards..." : isPlayful ? "🎨 Create Picture Cards!" : "Generate Illustrated Cards"}
              </Button>
            </Card>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground">Creating illustrations and cards...</p>
              </div>
            </div>
          )}

          {/* Card Display */}
          {cards.length > 0 && current && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => { setCards([]); setCardIndex(0); setFlipped(false) }}>
                  Back
                </Button>
                <span className="text-sm text-muted-foreground">
                  Card {cardIndex + 1} of {cards.length}
                </span>
                <VoiceChat
                  textToRead={flipped ? current.back : current.front}
                  token={token}
                  compact
                />
              </div>

              {/* Progress */}
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${((cardIndex + 1) / cards.length) * 100}%` }} />
              </div>

              {/* Card */}
              <div className="flex justify-center">
                <button onClick={() => setFlipped(!flipped)} className="w-full max-w-lg min-h-[350px] perspective-1000 cursor-pointer">
                  <div className={`relative w-full min-h-[350px] transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
                    style={{ transformStyle: "preserve-3d" }}>
                    {/* Front */}
                    <Card className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center backface-hidden"
                      style={{ backgroundColor: current.color ? `${current.color}10` : undefined, borderColor: current.color || undefined }}>
                      <div className="mb-4" dangerouslySetInnerHTML={{ __html: current.svg || "" }} />
                      <p className="text-xs text-muted-foreground mb-2">TAP TO FLIP</p>
                      <p className={`text-xl font-semibold text-foreground ${isPlayful ? "text-2xl" : ""}`}>
                        {current.front}
                      </p>
                    </Card>
                    {/* Back */}
                    <Card className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center [transform:rotateY(180deg)] backface-hidden bg-primary/5"
                      style={{ borderColor: current.color || undefined }}>
                      <p className="text-xs text-muted-foreground mb-2">ANSWER</p>
                      <p className="text-lg text-foreground leading-relaxed">{current.back}</p>
                    </Card>
                  </div>
                </button>
              </div>

              {/* Navigation */}
              <div className="flex justify-center gap-4">
                <Button variant="outline" disabled={cardIndex <= 0}
                  onClick={() => { setCardIndex((i) => i - 1); setFlipped(false) }}>
                  Previous
                </Button>
                <Button disabled={cardIndex >= cards.length - 1}
                  onClick={() => { setCardIndex((i) => i + 1); setFlipped(false) }}>
                  Next
                </Button>
              </div>

              {/* All cards thumbnail strip */}
              <div className="flex justify-center gap-2">
                {cards.map((_, i) => (
                  <button key={i}
                    onClick={() => { setCardIndex(i); setFlipped(false) }}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                      i === cardIndex
                        ? "bg-primary text-primary-foreground scale-110"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
