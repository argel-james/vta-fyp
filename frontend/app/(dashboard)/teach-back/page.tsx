"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useVisualTheme } from "@/context/visual-theme-context"
import { teachItBack, fetchCourses, type TeachBackResponse } from "@/lib/chat-service"

export default function TeachBackPage() {
  const { token } = useAuth()
  const { visualTheme } = useVisualTheme()
  const isPlayful = visualTheme === "playful"

  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [topic, setTopic] = useState("")
  const [level, setLevel] = useState("intermediate")
  const [explanation, setExplanation] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TeachBackResponse | null>(null)

  useEffect(() => {
    fetchCourses(token).then(setCourses).catch(() => {})
  }, [token])

  const handleSubmit = useCallback(async () => {
    if (!topic.trim() || !explanation.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const data = await teachItBack(courseId, topic, explanation, level, token)
      setResult(data)
    } catch {
      setResult({
        mastery_score: 0,
        overall_feedback: "Something went wrong. Please try again.",
        correct_points: [], gaps: [], misconceptions: [], suggestions: [],
        improved_explanation: "", course_id: courseId, topic,
      })
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, explanation, level, token])

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  const scoreEmoji = (score: number) => {
    if (score >= 90) return "🏆"
    if (score >= 70) return "⭐"
    if (score >= 50) return "👍"
    return "💪"
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-emerald-500/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-3xl px-6 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className={`text-3xl font-bold text-foreground ${isPlayful ? "tracking-wide" : ""}`}>
              {isPlayful ? "🎓 Teach It Back!" : "Teach-It-Back"}
            </h1>
            <p className="text-muted-foreground">
              Explain a concept in your own words and get AI feedback on your understanding.
            </p>
          </div>

          {/* Setup */}
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
                <label className="block text-sm font-semibold text-foreground mb-1">Topic *</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Cell Division, Binary Search..."
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

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Your Explanation *
              </label>
              <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)}
                rows={6} placeholder="Explain the concept as if you were teaching it to someone else..."
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground text-sm resize-none" />
            </div>

            <Button onClick={() => void handleSubmit()}
              disabled={!topic.trim() || !explanation.trim() || loading}
              className="w-full">
              {loading ? "Evaluating..." : isPlayful ? "🎯 Check My Understanding!" : "Evaluate My Explanation"}
            </Button>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Score */}
              <Card className={`p-6 text-center ${isPlayful ? "border-2 border-yellow-400" : ""}`}>
                <div className={`text-5xl mb-2 ${isPlayful ? "animate-bounce" : ""}`}>
                  {scoreEmoji(result.mastery_score)}
                </div>
                <div className={`text-4xl font-bold ${scoreColor(result.mastery_score)}`}>
                  {result.mastery_score}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Mastery Score</p>
                <p className="text-foreground mt-3">{result.overall_feedback}</p>
              </Card>

              {/* Details */}
              <div className="grid sm:grid-cols-2 gap-4">
                {result.correct_points.length > 0 && (
                  <Card className="p-4 border-green-500/30">
                    <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                      <span>✅</span> What You Got Right
                    </h3>
                    <ul className="space-y-1 text-sm text-foreground">
                      {result.correct_points.map((p, i) => <li key={i}>• {p}</li>)}
                    </ul>
                  </Card>
                )}

                {result.gaps.length > 0 && (
                  <Card className="p-4 border-yellow-500/30">
                    <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
                      <span>🔍</span> Gaps to Fill
                    </h3>
                    <ul className="space-y-1 text-sm text-foreground">
                      {result.gaps.map((g, i) => <li key={i}>• {g}</li>)}
                    </ul>
                  </Card>
                )}

                {result.misconceptions.length > 0 && (
                  <Card className="p-4 border-red-500/30">
                    <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                      <span>⚠️</span> Misconceptions
                    </h3>
                    <ul className="space-y-1 text-sm text-foreground">
                      {result.misconceptions.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                  </Card>
                )}

                {result.suggestions.length > 0 && (
                  <Card className="p-4 border-blue-500/30">
                    <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                      <span>📚</span> What to Review
                    </h3>
                    <ul className="space-y-1 text-sm text-foreground">
                      {result.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </Card>
                )}
              </div>

              {/* Model Explanation */}
              {result.improved_explanation && (
                <Card className="p-5">
                  <h3 className="font-semibold text-foreground mb-2">
                    {isPlayful ? "✨ Here's a great way to explain it:" : "Model Explanation"}
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {result.improved_explanation}
                  </p>
                </Card>
              )}

              <div className="flex justify-center">
                <Button variant="outline" onClick={() => { setResult(null); setExplanation("") }}>
                  Try Another Topic
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
