"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useVisualTheme } from "@/context/visual-theme-context"
import { scenarioLearning, fetchCourses, type ScenarioResponse } from "@/lib/chat-service"

interface HistoryEntry {
  role: "user" | "assistant"
  content: string
}

export default function ScenariosPage() {
  const { token } = useAuth()
  const { visualTheme } = useVisualTheme()
  const isPlayful = visualTheme === "playful"

  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [topic, setTopic] = useState("")
  const [level, setLevel] = useState("intermediate")
  const [loading, setLoading] = useState(false)
  const [scene, setScene] = useState<ScenarioResponse | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [, setPastFeedback] = useState<string[]>([])

  useEffect(() => {
    fetchCourses(token).then(setCourses).catch(() => {})
  }, [token])

  const startScenario = useCallback(async () => {
    setLoading(true)
    setScene(null)
    setHistory([])
    setPastFeedback([])
    try {
      const result = await scenarioLearning(courseId, topic || undefined, undefined, undefined, level, token)
      setScene(result)
      setHistory([{ role: "assistant", content: result.narrative }])
    } catch {
      setScene(null)
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, level, token])

  const makeChoice = useCallback(async (choice: string) => {
    setLoading(true)
    const newHistory: HistoryEntry[] = [...history, { role: "user", content: choice }]
    setHistory(newHistory)
    try {
      const result = await scenarioLearning(courseId, topic || undefined, choice, newHistory, level, token)
      setScene(result)
      if (result.feedback) setPastFeedback((prev) => [...prev, result.feedback!])
      setHistory([...newHistory, { role: "assistant", content: result.narrative }])
    } catch {
      setScene(null)
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, history, level, token])

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-amber-500/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-3xl px-6 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className={`text-3xl font-bold text-foreground ${isPlayful ? "tracking-wide" : ""}`}>
              {isPlayful ? "🎮 Adventure Learning" : "Scenario-Based Learning"}
            </h1>
            <p className="text-muted-foreground">
              Learn through interactive scenarios where your choices matter.
            </p>
          </div>

          {/* Setup */}
          {!scene && (
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
                  <label className="block text-sm font-semibold text-foreground mb-1">Topic (optional)</label>
                  <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Ecosystems, Algorithms..."
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
              <Button onClick={() => void startScenario()} disabled={loading} className="w-full">
                {loading ? "Creating scenario..." : isPlayful ? "🚀 Start Adventure!" : "Start Scenario"}
              </Button>
            </Card>
          )}

          {/* Active Scenario */}
          {scene && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => { setScene(null); setHistory([]); setPastFeedback([]) }}>
                  Exit
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Scene {scene.scene_number} of {scene.total_scenes}</span>
                  {scene.concept_being_tested && (
                    <span className="px-2 py-0.5 bg-secondary rounded-full text-xs">
                      {scene.concept_being_tested}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${(scene.scene_number / scene.total_scenes) * 100}%` }} />
              </div>

              {/* Feedback from last choice */}
              {scene.feedback && (
                <Card className={`p-4 ${isPlayful ? "border-2 border-blue-300 dark:border-blue-700 bg-blue-500/5" : "bg-secondary/30"}`}>
                  <p className="text-sm text-foreground">
                    {isPlayful && <span className="mr-1">💡</span>}
                    <span className="font-semibold">Feedback: </span>
                    {scene.feedback}
                  </p>
                </Card>
              )}

              {/* Narrative */}
              <Card className={`p-6 ${isPlayful ? "border-2 border-amber-300 dark:border-amber-700" : ""}`}>
                <p className={`text-foreground leading-relaxed whitespace-pre-wrap ${isPlayful ? "text-lg" : ""}`}>
                  {isPlayful && <span className="mr-1">📖</span>}
                  {scene.narrative}
                </p>
              </Card>

              {/* Choices or Final */}
              {scene.is_final ? (
                <Card className={`p-6 text-center space-y-4 ${isPlayful ? "border-2 border-yellow-400" : ""}`}>
                  <div className={`text-5xl ${isPlayful ? "animate-bounce" : ""}`}>
                    {(scene.score ?? 0) >= 80 ? "🏆" : (scene.score ?? 0) >= 50 ? "⭐" : "💪"}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Scenario Complete!
                  </h2>
                  {scene.score !== undefined && (
                    <p className="text-3xl font-bold text-primary">{scene.score}%</p>
                  )}
                  {scene.concepts_learned && scene.concepts_learned.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {scene.concepts_learned.map((c, i) => (
                        <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button onClick={() => { setScene(null); setHistory([]); setPastFeedback([]) }}>
                    Play Another Scenario
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">What do you do?</p>
                  {scene.choices.map((choice, i) => (
                    <button key={i} onClick={() => void makeChoice(choice)}
                      disabled={loading}
                      className={`w-full px-5 py-4 text-left rounded-xl border-2 transition-all text-sm
                        ${isPlayful
                          ? "border-amber-300/50 dark:border-amber-700/50 hover:border-amber-400 hover:bg-amber-500/5"
                          : "border-border hover:border-primary/50 hover:bg-secondary/30"
                        } disabled:opacity-50`}>
                      <span className="font-medium text-foreground">
                        {String.fromCharCode(65 + i)}. {choice}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex justify-center py-4">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
