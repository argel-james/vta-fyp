"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useVisualTheme } from "@/context/visual-theme-context"
import { revisionFromMistakes, fetchCourses, type MistakeRevisionData } from "@/lib/chat-service"

const STORAGE_KEY = "vta-mistake-journal"

interface MistakeEntry {
  question: string
  student_answer: string
  correct_answer: string
  topic?: string
  date: string
}

function loadMistakes(): MistakeEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

function saveMistakes(entries: MistakeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export default function RevisionPage() {
  const { token } = useAuth()
  const { visualTheme } = useVisualTheme()
  const isPlayful = visualTheme === "playful"

  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [level, setLevel] = useState("intermediate")
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState<MistakeRevisionData | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMistake, setNewMistake] = useState({ question: "", student_answer: "", correct_answer: "", topic: "" })

  useEffect(() => {
    fetchCourses(token).then(setCourses).catch(() => {})
    setMistakes(loadMistakes())
  }, [token])

  const addMistake = () => {
    if (!newMistake.question.trim()) return
    const entry: MistakeEntry = {
      ...newMistake,
      date: new Date().toISOString().slice(0, 10),
    }
    const updated = [entry, ...mistakes]
    setMistakes(updated)
    saveMistakes(updated)
    setNewMistake({ question: "", student_answer: "", correct_answer: "", topic: "" })
    setShowAddForm(false)
  }

  const removeMistake = (index: number) => {
    const updated = mistakes.filter((_, i) => i !== index)
    setMistakes(updated)
    saveMistakes(updated)
  }

  const handleGenerateRevision = useCallback(async () => {
    if (mistakes.length === 0) return
    setLoading(true)
    setRevision(null)
    try {
      const data = await revisionFromMistakes(courseId, mistakes, level, token)
      setRevision(data)
    } catch {
      setRevision(null)
    } finally {
      setLoading(false)
    }
  }, [courseId, mistakes, level, token])

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-rose-500/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-3xl px-6 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className={`text-3xl font-bold text-foreground ${isPlayful ? "tracking-wide" : ""}`}>
              {isPlayful ? "📓 Mistake Journal" : "Mistake Journal & Revision"}
            </h1>
            <p className="text-muted-foreground">
              Track your mistakes and get targeted revision material to strengthen weak areas.
            </p>
          </div>

          {/* Controls */}
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
                <label className="block text-sm font-semibold text-foreground mb-1">Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)} className="flex-1 h-10">
                  + Add Mistake
                </Button>
              </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border">
                <input type="text" placeholder="Question or concept *"
                  value={newMistake.question} onChange={(e) => setNewMistake({ ...newMistake, question: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Your answer"
                    value={newMistake.student_answer} onChange={(e) => setNewMistake({ ...newMistake, student_answer: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                  <input type="text" placeholder="Correct answer"
                    value={newMistake.correct_answer} onChange={(e) => setNewMistake({ ...newMistake, correct_answer: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                </div>
                <input type="text" placeholder="Topic (optional)"
                  value={newMistake.topic} onChange={(e) => setNewMistake({ ...newMistake, topic: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                <Button onClick={addMistake} disabled={!newMistake.question.trim()} size="sm">
                  Save Mistake
                </Button>
              </div>
            )}
          </Card>

          {/* Mistake List */}
          {mistakes.length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground">
                  Your Mistakes ({mistakes.length})
                </h3>
                <Button onClick={() => void handleGenerateRevision()} disabled={loading}>
                  {loading ? "Generating..." : isPlayful ? "🎯 Get Smart Revision!" : "Generate Revision Material"}
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {mistakes.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{m.question}</p>
                      {m.student_answer && (
                        <p className="text-red-500 text-xs mt-1">Your answer: {m.student_answer}</p>
                      )}
                      {m.correct_answer && (
                        <p className="text-green-500 text-xs">Correct: {m.correct_answer}</p>
                      )}
                      {m.topic && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full mt-1 inline-block">
                          {m.topic}
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeMistake(i)}
                      className="text-muted-foreground hover:text-destructive text-xs p-1">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {mistakes.length === 0 && !revision && (
            <Card className="p-8 text-center space-y-3">
              <div className="text-5xl">{isPlayful ? "📝" : "📓"}</div>
              <h3 className="text-lg font-semibold text-foreground">No mistakes recorded yet</h3>
              <p className="text-sm text-muted-foreground">
                Add mistakes from your quizzes and studies, then generate targeted revision material.
              </p>
              <p className="text-xs text-muted-foreground">
                Tip: Mistakes from quizzes on the Learn page are automatically saved here!
              </p>
            </Card>
          )}

          {/* Revision Results */}
          {revision && (
            <div className="space-y-4">
              <Card className={`p-6 text-center ${isPlayful ? "border-2 border-rose-300" : ""}`}>
                <div className="text-4xl font-bold text-primary">{revision.estimated_mastery}%</div>
                <p className="text-sm text-muted-foreground">Estimated Mastery</p>
                <p className="text-foreground mt-2">{revision.overall_advice}</p>
              </Card>

              {revision.weak_areas.map((area, i) => (
                <Card key={i} className="p-5 space-y-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <span className="w-6 h-6 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                      {i + 1}
                    </span>
                    {area.concept}
                  </h3>
                  <p className="text-sm text-foreground/90">{area.explanation}</p>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                    <p className="text-sm text-foreground/80">
                      <span className="font-semibold">Why you struggled: </span>
                      {area.why_student_struggled}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">KEY POINTS:</p>
                    {area.key_points.map((kp, j) => (
                      <p key={j} className="text-sm text-foreground/90 pl-3">• {kp}</p>
                    ))}
                  </div>
                  {area.practice_questions && area.practice_questions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">PRACTICE:</p>
                      {area.practice_questions.map((pq, j) => (
                        <div key={j} className="p-3 bg-secondary/20 rounded-lg text-sm">
                          <p className="font-medium text-foreground">{pq.question}</p>
                          <div className="mt-2 space-y-1">
                            {pq.options.map((opt, k) => (
                              <p key={k} className={`text-foreground/80 ${k === pq.correct_index ? "font-semibold text-green-600 dark:text-green-400" : ""}`}>
                                {opt} {k === pq.correct_index && "✓"}
                              </p>
                            ))}
                          </div>
                          {pq.explanation && (
                            <p className="text-xs text-muted-foreground mt-1">{pq.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
