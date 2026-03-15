"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useVisualTheme } from "@/context/visual-theme-context"
import { fetchFlashcards, fetchQuiz, fetchSummary, fetchCourses, logEvent } from "@/lib/chat-service"
import type { Flashcard, QuizQuestion } from "@/types"

type LearnMode = "menu" | "flashcards" | "quiz" | "summary"

interface QuizState {
  currentIndex: number
  selectedOption: number | null
  showResult: boolean
  score: number
  finished: boolean
}

const MASCOTS = ["🦉", "🐸", "🦊", "🐼", "🐶", "🐱"] as const

export default function LearnPage() {
  const { token, user } = useAuth()
  const { visualTheme } = useVisualTheme()
  const isPlayful = visualTheme === "playful"

  const [mode, setMode] = useState<LearnMode>("menu")
  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quiz, setQuiz] = useState<QuizState>({
    currentIndex: 0,
    selectedOption: null,
    showResult: false,
    score: 0,
    finished: false,
  })

  const [summary, setSummary] = useState("")
  const [streak, setStreak] = useState(0)
  const [mascot] = useState(() => MASCOTS[Math.floor(Math.random() * MASCOTS.length)])

  useEffect(() => {
    fetchCourses(token).then(setCourses).catch(() => {})
  }, [token])

  const handleStartFlashcards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cards = await fetchFlashcards(courseId, topic || undefined, 6, token)
      setFlashcards(cards)
      setCardIndex(0)
      setFlipped(false)
      setMode("flashcards")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate flashcards")
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, token])

  const handleStartQuiz = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const questions = await fetchQuiz(courseId, topic || undefined, 5, token)
      setQuizQuestions(questions)
      setQuiz({ currentIndex: 0, selectedOption: null, showResult: false, score: 0, finished: false })
      setMode("quiz")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz")
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, token])

  const handleStartSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchSummary(courseId, topic || undefined, token)
      setSummary(result)
      setMode("summary")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary")
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, token])

  const selectQuizOption = (optionIndex: number) => {
    if (quiz.showResult) return
    const correct = optionIndex === quizQuestions[quiz.currentIndex]?.correct_index
    setQuiz((prev) => ({
      ...prev,
      selectedOption: optionIndex,
      showResult: true,
      score: correct ? prev.score + 1 : prev.score,
    }))
    if (correct) setStreak((s) => s + 1)
    else setStreak(0)

    if (user?.email) {
      void logEvent({
        email: user.email, course_id: courseId, event_type: "answer_result",
        topic: topic || undefined, question_index: quiz.currentIndex,
        detail: correct ? "correct" : "incorrect",
      }, token)
    }
  }

  const nextQuizQuestion = () => {
    if (quiz.currentIndex + 1 >= quizQuestions.length) {
      setQuiz((prev) => ({ ...prev, finished: true }))
      if (user?.email) {
        void logEvent({
          email: user.email, course_id: courseId, event_type: "quiz_completed",
          topic: topic || undefined, score: quiz.score, total: quizQuestions.length,
        }, token)
      }
      return
    }
    setQuiz((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      selectedOption: null,
      showResult: false,
    }))
  }

  const scoreEmoji = quiz.finished
    ? quiz.score === quizQuestions.length
      ? "🏆"
      : quiz.score >= quizQuestions.length * 0.6
        ? "⭐"
        : "💪"
    : ""

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-4xl px-6 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className={`text-3xl font-bold text-foreground ${isPlayful ? "tracking-wide" : ""}`}>
                {isPlayful ? `${mascot} Learn & Play!` : "Learn & Practice"}
              </h1>
              <p className="text-muted-foreground">
                {isPlayful
                  ? "Pick a fun activity and start learning!"
                  : "Flashcards, quizzes, and summaries from your course materials."}
              </p>
            </div>
            {streak > 1 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isPlayful ? "bg-orange-500/20 text-orange-600 dark:text-orange-300 text-lg animate-bounce" : "bg-primary/10 text-primary text-sm"}`}>
                🔥 {streak} streak!
              </div>
            )}
          </div>

          {/* Course + Topic Selector */}
          {mode === "menu" && (
            <>
              <Card className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Course</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      {courses.length > 0 ? (
                        courses.map((c) => (
                          <option key={c} value={c}>
                            {c.toUpperCase()}
                          </option>
                        ))
                      ) : (
                        <option value={courseId}>{courseId.toUpperCase()}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Topic (optional)</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={isPlayful ? "e.g. Animals, Colors, Numbers..." : "e.g. Recursion, UART, Sorting..."}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </Card>

              {/* Activity Cards */}
              <div className="grid sm:grid-cols-3 gap-6">
                <button onClick={() => void handleStartFlashcards()} disabled={loading} className="group">
                  <Card className={`p-6 text-center space-y-3 hover:shadow-xl transition-all hover:scale-105 ${isPlayful ? "border-2 border-pink-300 dark:border-pink-700" : ""}`}>
                    <div className={`text-5xl ${isPlayful ? "animate-bounce" : ""}`}>🃏</div>
                    <h3 className="font-bold text-foreground text-lg">Flashcards</h3>
                    <p className="text-sm text-muted-foreground">
                      {isPlayful ? "Flip the cards to learn!" : "Study key concepts with generated flashcards."}
                    </p>
                  </Card>
                </button>

                <button onClick={() => void handleStartQuiz()} disabled={loading} className="group">
                  <Card className={`p-6 text-center space-y-3 hover:shadow-xl transition-all hover:scale-105 ${isPlayful ? "border-2 border-green-300 dark:border-green-700" : ""}`}>
                    <div className={`text-5xl ${isPlayful ? "animate-bounce" : ""}`}>🧠</div>
                    <h3 className="font-bold text-foreground text-lg">Quiz</h3>
                    <p className="text-sm text-muted-foreground">
                      {isPlayful ? "Answer questions and earn stars!" : "Test your knowledge with multiple choice."}
                    </p>
                  </Card>
                </button>

                <button onClick={() => void handleStartSummary()} disabled={loading} className="group">
                  <Card className={`p-6 text-center space-y-3 hover:shadow-xl transition-all hover:scale-105 ${isPlayful ? "border-2 border-blue-300 dark:border-blue-700" : ""}`}>
                    <div className={`text-5xl ${isPlayful ? "animate-bounce" : ""}`}>📝</div>
                    <h3 className="font-bold text-foreground text-lg">Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      {isPlayful ? "Get the key ideas quickly!" : "AI-generated notes from your materials."}
                    </p>
                  </Card>
                </button>
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <div className={`flex flex-col items-center gap-3 ${isPlayful ? "text-2xl" : ""}`}>
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-muted-foreground">{isPlayful ? `${mascot} Preparing your adventure...` : "Generating content..."}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Flashcards Mode */}
          {mode === "flashcards" && flashcards.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setMode("menu")}>Back</Button>
                <span className="text-sm text-muted-foreground">
                  Card {cardIndex + 1} of {flashcards.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${((cardIndex + 1) / flashcards.length) * 100}%` }}
                />
              </div>

              {/* Card */}
              <div className="flex justify-center">
                <button
                  onClick={() => setFlipped(!flipped)}
                  className={`w-full max-w-lg min-h-[250px] perspective-1000 cursor-pointer`}
                >
                  <div className={`relative w-full min-h-[250px] transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`} style={{ transformStyle: "preserve-3d" }}>
                    {/* Front */}
                    <Card className={`absolute inset-0 p-8 flex flex-col items-center justify-center text-center backface-hidden ${isPlayful ? "border-3 border-pink-400 dark:border-pink-600 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30" : ""}`}>
                      <p className="text-xs text-muted-foreground mb-3">TAP TO FLIP</p>
                      <p className={`text-xl font-semibold text-foreground ${isPlayful ? "text-2xl" : ""}`}>
                        {flashcards[cardIndex]?.front}
                      </p>
                    </Card>
                    {/* Back */}
                    <Card className={`absolute inset-0 p-8 flex flex-col items-center justify-center text-center [transform:rotateY(180deg)] backface-hidden ${isPlayful ? "border-3 border-green-400 dark:border-green-600 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30" : "bg-primary/5"}`}>
                      <p className="text-xs text-muted-foreground mb-3">ANSWER</p>
                      <p className="text-lg text-foreground leading-relaxed">{flashcards[cardIndex]?.back}</p>
                    </Card>
                  </div>
                </button>
              </div>

              {/* Navigation */}
              <div className="flex justify-center gap-4">
                <Button variant="outline" disabled={cardIndex <= 0} onClick={() => { setCardIndex((i) => i - 1); setFlipped(false) }}>
                  Previous
                </Button>
                <Button disabled={cardIndex >= flashcards.length - 1} onClick={() => { setCardIndex((i) => i + 1); setFlipped(false) }}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Quiz Mode */}
          {mode === "quiz" && quizQuestions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setMode("menu")}>Back</Button>
                <span className="text-sm text-muted-foreground">
                  Question {quiz.currentIndex + 1} of {quizQuestions.length}
                </span>
              </div>

              {/* Progress */}
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${((quiz.currentIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>

              {quiz.finished ? (
                <Card className={`p-8 text-center space-y-4 ${isPlayful ? "border-2 border-yellow-400" : ""}`}>
                  <div className={`text-6xl ${isPlayful ? "animate-bounce" : ""}`}>{scoreEmoji}</div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {quiz.score === quizQuestions.length
                      ? isPlayful ? "PERFECT! You're a superstar!" : "Perfect Score!"
                      : isPlayful ? `Great try! You got ${quiz.score}!` : `Score: ${quiz.score} / ${quizQuestions.length}`}
                  </h2>
                  <p className="text-muted-foreground">
                    {quiz.score}/{quizQuestions.length} correct
                  </p>
                  <div className="flex justify-center gap-3 pt-4">
                    <Button variant="outline" onClick={() => setMode("menu")}>Back to Menu</Button>
                    <Button onClick={() => void handleStartQuiz()}>Try Again</Button>
                  </div>
                </Card>
              ) : (
                <Card className={`p-6 space-y-5 ${isPlayful ? "border-2 border-blue-300 dark:border-blue-700" : ""}`}>
                  <h3 className={`font-semibold text-foreground ${isPlayful ? "text-xl" : "text-lg"}`}>
                    {quizQuestions[quiz.currentIndex]?.question}
                  </h3>

                  <div className="space-y-3">
                    {quizQuestions[quiz.currentIndex]?.options.map((option, idx) => {
                      const isSelected = quiz.selectedOption === idx
                      const isCorrect = idx === quizQuestions[quiz.currentIndex]?.correct_index
                      let optionClass = "border-border hover:border-primary/50 hover:bg-secondary/30"
                      if (quiz.showResult) {
                        if (isCorrect) optionClass = "border-green-500 bg-green-500/10"
                        else if (isSelected) optionClass = "border-red-500 bg-red-500/10"
                      } else if (isSelected) {
                        optionClass = "border-primary bg-primary/10"
                      }
                      return (
                        <button
                          key={idx}
                          onClick={() => selectQuizOption(idx)}
                          disabled={quiz.showResult}
                          className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all ${optionClass}`}
                        >
                          <span className="font-medium text-foreground">
                            {String.fromCharCode(65 + idx)}. {option}
                          </span>
                          {quiz.showResult && isCorrect && <span className="ml-2">✅</span>}
                          {quiz.showResult && isSelected && !isCorrect && <span className="ml-2">❌</span>}
                        </button>
                      )
                    })}
                  </div>

                  {quiz.showResult && (
                    <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">Explanation: </span>
                        {quizQuestions[quiz.currentIndex]?.explanation}
                      </p>
                    </div>
                  )}

                  {quiz.showResult && (
                    <div className="flex justify-end">
                      <Button onClick={nextQuizQuestion}>
                        {quiz.currentIndex + 1 >= quizQuestions.length ? "See Results" : "Next Question"}
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* Summary Mode */}
          {mode === "summary" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setMode("menu")}>Back</Button>
                <h2 className="text-lg font-semibold text-foreground">Summarized Notes</h2>
              </div>

              <Card className={`p-6 ${isPlayful ? "border-2 border-blue-300 dark:border-blue-700" : ""}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
                  {summary}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
