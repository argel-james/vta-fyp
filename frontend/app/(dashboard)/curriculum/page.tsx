"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { CurriculumCalendar } from "@/components/curriculum-calendar"
import {
  fetchCurricula,
  fetchCourses,
  fetchCourseTopics,
  generateCurriculumPlan,
  createCurriculum,
  updateTopicStatus,
  deleteCurriculum,
  type CurriculumRecord,
  type CurriculumTopicItem,
  type CourseTopic,
  type PlanItem,
} from "@/lib/chat-service"

type WizardStep = 0 | 1 | 2
type ViewMode = "list" | "calendar" | "schedule"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  not_started: { label: "Not Started", color: "text-muted-foreground", bg: "bg-muted", dot: "bg-gray-400" },
  in_progress: { label: "In Progress", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/20", dot: "bg-blue-500" },
  completed: { label: "Completed", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/20", dot: "bg-green-500" },
  skipped: { label: "Skipped", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/20", dot: "bg-orange-400" },
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const QUICK_ACTIONS = [
  { icon: "💬", label: "Chat", href: "/chat", param: "prompt", makeValue: (t: string) => `Explain ${t}` },
  { icon: "🧠", label: "Quiz", href: "/learn", param: "topic" },
  { icon: "🧙‍♂️", label: "Socratic", href: "/socratic", param: "topic" },
  { icon: "🗺️", label: "Map", href: "/concept-map", param: "topic" },
  { icon: "🎓", label: "Teach", href: "/teach-back", param: "topic" },
]

function parseWeekNumber(targetDate: string | null): number | null {
  if (!targetDate) return null
  const match = targetDate.match(/week\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

export default function CurriculumPage() {
  const { token } = useAuth()

  const [curricula, setCurricula] = useState<CurriculumRecord[]>([])
  const [courses, setCourses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>(0)
  const [selectedCourse, setSelectedCourse] = useState("")
  const [availableTopics, setAvailableTopics] = useState<CourseTopic[]>([])
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())
  const [classDay, setClassDay] = useState("")
  const [classStartTime, setClassStartTime] = useState("")
  const [classEndTime, setClassEndTime] = useState("")
  const [curriculumTitle, setCurriculumTitle] = useState("")
  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [currData, courseData] = await Promise.all([
        fetchCurricula(token),
        fetchCourses(token),
      ])
      setCurricula(currData)
      setCourses(courseData)
    } catch {
      // empty state
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void loadData() }, [loadData])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // ── Wizard handlers ────────────────────────────────────────────────

  const handleCourseSelect = async (courseId: string) => {
    setSelectedCourse(courseId)
    setSelectedTopics(new Set())
    setAvailableTopics([])
    if (!courseId) return
    setTopicsLoading(true)
    try {
      const topics = await fetchCourseTopics(courseId, token)
      setAvailableTopics(topics)
    } catch {
      setWizardError("Failed to load topics for this course.")
    } finally {
      setTopicsLoading(false)
    }
  }

  const toggleTopic = (name: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectAllTopics = () => {
    if (selectedTopics.size === availableTopics.length) setSelectedTopics(new Set())
    else setSelectedTopics(new Set(availableTopics.map((t) => t.name)))
  }

  const handleGeneratePlan = async () => {
    setWizardLoading(true)
    setWizardError(null)
    try {
      const plan = await generateCurriculumPlan(
        selectedCourse, Array.from(selectedTopics),
        classDay || null, classStartTime || null, classEndTime || null, token,
      )
      setPlanItems(plan)
      setWizardStep(1)
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : "Failed to generate plan")
    } finally {
      setWizardLoading(false)
    }
  }

  const removePlanItem = (index: number) => {
    setPlanItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order_index: i })))
  }

  const movePlanItem = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= planItems.length) return
    setPlanItems((prev) => {
      const next = [...prev]
      ;[next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]]
      return next.map((item, i) => ({ ...item, order_index: i }))
    })
  }

  const handleCreateCurriculum = async () => {
    if (!curriculumTitle.trim()) { setWizardError("Please enter a title."); return }
    setWizardLoading(true)
    setWizardError(null)
    try {
      await createCurriculum(selectedCourse, curriculumTitle.trim(), planItems,
        classDay || null, classStartTime || null, classEndTime || null, token)
      setWizardOpen(false)
      resetWizard()
      setSuccessMessage("Curriculum created successfully!")
      await loadData()
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : "Failed to create curriculum")
    } finally {
      setWizardLoading(false)
    }
  }

  const handleTopicStatusChange = async (curriculumId: number, topicId: number, newStatus: string) => {
    try {
      const updated = await updateTopicStatus(curriculumId, topicId, newStatus, token)
      setCurricula((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch { /* silent */ }
  }

  const handleDelete = async (curriculumId: number) => {
    try {
      await deleteCurriculum(curriculumId, token)
      setCurricula((prev) => prev.filter((c) => c.id !== curriculumId))
      if (expandedId === curriculumId) setExpandedId(null)
    } catch { /* silent */ }
  }

  const resetWizard = () => {
    setWizardStep(0); setSelectedCourse(""); setAvailableTopics([])
    setSelectedTopics(new Set()); setClassDay(""); setClassStartTime("")
    setClassEndTime(""); setCurriculumTitle(""); setPlanItems([]); setWizardError(null)
  }

  const totalHours = (topics: CurriculumTopicItem[]) =>
    topics.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)

  // ── Calendar helpers ───────────────────────────────────────────────

  function getWeekGroups(curr: CurriculumRecord) {
    const weeks = new Map<number, CurriculumTopicItem[]>()
    for (const topic of curr.topics) {
      const wk = parseWeekNumber(topic.target_date) || 0
      const list = weeks.get(wk) || []
      list.push(topic)
      weeks.set(wk, list)
    }
    return Array.from(weeks.entries()).sort((a, b) => a[0] - b[0])
  }

  const currentWeekEstimate = useMemo(() => {
    const activeCurr = curricula.find((c) => c.status === "active")
    if (!activeCurr) return null
    const completed = activeCurr.topics.filter((t) => t.status === "completed" || t.status === "skipped")
    const total = activeCurr.topics.length
    if (total === 0) return 1
    const weeks = getWeekGroups(activeCurr)
    const maxWeek = Math.max(...weeks.map(([w]) => w), 1)
    return Math.min(Math.ceil((completed.length / total) * maxWeek) + 1, maxWeek)
  }, [curricula])

  function buildDeepLink(action: typeof QUICK_ACTIONS[number], courseId: string, topicName: string) {
    const params = new URLSearchParams({ course: courseId })
    if (action.makeValue) {
      params.set(action.param, action.makeValue(topicName))
    } else {
      params.set(action.param, topicName)
    }
    return `${action.href}?${params.toString()}`
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading curricula...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-5xl px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground">Curriculum Planner</h1>
              <p className="text-muted-foreground">
                Create AI-powered study plans and jump straight into learning activities.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {curricula.length > 0 && (
                <div className="flex bg-secondary/30 rounded-lg p-0.5">
                  {(["list", "calendar", "schedule"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "list" ? "List" : mode === "calendar" ? "Timeline" : "Schedule"}
                    </button>
                  ))}
                </div>
              )}
              <Button onClick={() => { resetWizard(); setWizardOpen(true) }}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Curriculum
              </Button>
            </div>
          </div>

          {/* Success Toast */}
          {successMessage && (
            <div className="px-4 py-3 bg-green-500/15 border border-green-500/30 rounded-lg text-green-700 dark:text-green-300 text-sm font-medium">
              {successMessage}
            </div>
          )}

          {/* Empty State */}
          {curricula.length === 0 && !wizardOpen && (
            <Card className="p-12 text-center">
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Curricula Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first study plan to start tracking your learning progress.
              </p>
              <Button onClick={() => { resetWizard(); setWizardOpen(true) }}>
                Create Your First Curriculum
              </Button>
            </Card>
          )}

          {/* ─── Timeline / Calendar View ──────────────────────────────── */}
          {viewMode === "calendar" && curricula.length > 0 && (
            <div className="space-y-6">
              {curricula.map((curr) => {
                const weekGroups = getWeekGroups(curr)
                return (
                  <Card key={curr.id} className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{curr.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground/70">{curr.course_id.toUpperCase()}</span>
                            {curr.class_day && (
                              <span>Class: {curr.class_day} {curr.class_start_time && `${curr.class_start_time}-${curr.class_end_time}`}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${curr.progress_percent}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{Math.round(curr.progress_percent)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-5">
                      <div className="relative">
                        {/* Vertical timeline line */}
                        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border" />

                        {weekGroups.map(([weekNum, topics], groupIdx) => {
                          const isCurrentWeek = currentWeekEstimate === weekNum
                          const weekCompleted = topics.every((t) => t.status === "completed" || t.status === "skipped")
                          const weekInProgress = topics.some((t) => t.status === "in_progress")

                          return (
                            <div key={weekNum} className={`relative pl-12 pb-8 last:pb-0 ${groupIdx === 0 ? "" : ""}`}>
                              {/* Timeline dot */}
                              <div className={`absolute left-2.5 top-1 w-[15px] h-[15px] rounded-full border-2 z-10 transition-colors ${
                                weekCompleted
                                  ? "bg-green-500 border-green-500"
                                  : isCurrentWeek || weekInProgress
                                  ? "bg-blue-500 border-blue-500 ring-4 ring-blue-500/20"
                                  : "bg-background border-border"
                              }`}>
                                {weekCompleted && (
                                  <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>

                              {/* Week header */}
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className={`text-sm font-bold ${
                                  isCurrentWeek ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                                }`}>
                                  {weekNum === 0 ? "Unscheduled" : `Week ${weekNum}`}
                                </h4>
                                {isCurrentWeek && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 uppercase">
                                    Current
                                  </span>
                                )}
                                {weekCompleted && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-600 dark:text-green-400 uppercase">
                                    Done
                                  </span>
                                )}
                              </div>

                              {/* Topics in this week */}
                              <div className="space-y-2">
                                {topics.map((topic) => (
                                  <div
                                    key={topic.id}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group"
                                  >
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[topic.status]?.dot || "bg-gray-400"}`} />
                                    <span className="text-sm shrink-0">{topic.item_type === "quiz" ? "📝" : "📖"}</span>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium text-foreground">{topic.topic_name}</span>
                                      {topic.subtopics.length > 0 && (
                                        <p className="text-xs text-muted-foreground truncate">{topic.subtopics.join(" · ")}</p>
                                      )}
                                    </div>
                                    {topic.estimated_hours != null && (
                                      <span className="text-xs text-muted-foreground shrink-0">{topic.estimated_hours}h</span>
                                    )}
                                    {/* Quick actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      {QUICK_ACTIONS.map((action) => (
                                        <Link
                                          key={action.label}
                                          href={buildDeepLink(action, curr.course_id, topic.topic_name)}
                                          className="p-1 rounded hover:bg-secondary text-xs"
                                          title={`${action.label}: ${topic.topic_name}`}
                                        >
                                          {action.icon}
                                        </Link>
                                      ))}
                                    </div>
                                    <select
                                      value={topic.status}
                                      onChange={(e) => void handleTopicStatusChange(curr.id, topic.id, e.target.value)}
                                      className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${STATUS_CONFIG[topic.status]?.bg || "bg-muted"} ${STATUS_CONFIG[topic.status]?.color || "text-foreground"}`}
                                    >
                                      <option value="not_started">Not Started</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="completed">Completed</option>
                                      <option value="skipped">Skipped</option>
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* ─── Schedule / Calendar View ────────────────────────────── */}
          {viewMode === "schedule" && curricula.length > 0 && (
            <CurriculumCalendar
              curricula={curricula}
              onStatusChange={(currId, topicId, status) =>
                void handleTopicStatusChange(currId, topicId, status)
              }
            />
          )}

          {/* ─── List View ─────────────────────────────────────────────── */}
          {viewMode === "list" && curricula.length > 0 && (
            <div className="space-y-4">
              {curricula.map((curr) => (
                <Card key={curr.id} className="overflow-hidden transition-all duration-300 hover:shadow-md">
                  {/* Card header */}
                  <button
                    onClick={() => setExpandedId(expandedId === curr.id ? null : curr.id)}
                    className="w-full text-left px-6 py-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-foreground truncate">{curr.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            curr.status === "active" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : curr.status === "completed" ? "bg-green-500/15 text-green-600 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {curr.status.charAt(0).toUpperCase() + curr.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground/70">{curr.course_id.toUpperCase()}</span>
                          <span>{curr.topics.length} items</span>
                          <span>{totalHours(curr.topics).toFixed(1)}h total</span>
                          {curr.class_day && (
                            <span>Class: {curr.class_day}{curr.class_start_time && ` ${curr.class_start_time}`}{curr.class_end_time && `-${curr.class_end_time}`}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${curr.progress_percent}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-foreground min-w-[3rem] text-right">{Math.round(curr.progress_percent)}%</span>
                        </div>
                        <svg className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${expandedId === curr.id ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded topic list */}
                  {expandedId === curr.id && (
                    <div className="border-t border-border">
                      <div className="px-6 py-4 space-y-2">
                        {curr.topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group"
                          >
                            <span className="text-lg shrink-0">{topic.item_type === "quiz" ? "📝" : "📖"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground text-sm truncate">{topic.topic_name}</span>
                                {topic.item_type === "quiz" && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 uppercase">Quiz</span>
                                )}
                              </div>
                              {topic.subtopics.length > 0 && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{topic.subtopics.join(" · ")}</p>
                              )}
                            </div>
                            {topic.target_date && <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{topic.target_date}</span>}
                            {topic.estimated_hours != null && <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{topic.estimated_hours}h</span>}
                            {/* Quick action deep-links */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {QUICK_ACTIONS.map((action) => (
                                <Link
                                  key={action.label}
                                  href={buildDeepLink(action, curr.course_id, topic.topic_name)}
                                  className="p-1.5 rounded hover:bg-secondary text-xs"
                                  title={`${action.label}: ${topic.topic_name}`}
                                >
                                  {action.icon}
                                </Link>
                              ))}
                            </div>
                            <select
                              value={topic.status}
                              onChange={(e) => void handleTopicStatusChange(curr.id, topic.id, e.target.value)}
                              className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer transition-colors ${STATUS_CONFIG[topic.status]?.bg || "bg-muted"} ${STATUS_CONFIG[topic.status]?.color || "text-foreground"}`}
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="skipped">Skipped</option>
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="px-6 py-3 border-t border-border flex justify-end">
                        <Button variant="destructive" size="sm" onClick={() => void handleDelete(curr.id)}>
                          Delete Curriculum
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* ─── Creation Wizard Modal ─────────────────────────────────── */}
          {wizardOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setWizardOpen(false); resetWizard() }} />
              <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden z-10">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {wizardStep === 0 ? "Select Topics" : wizardStep === 1 ? "Review Study Plan" : "Confirm & Create"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Step {wizardStep + 1} of 3</p>
                  </div>
                  <button onClick={() => { setWizardOpen(false); resetWizard() }} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Step progress */}
                <div className="px-6 py-3 border-b border-border shrink-0">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((step) => (
                      <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step <= wizardStep ? "bg-primary" : "bg-secondary"}`} />
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {wizardError && (
                    <div className="px-4 py-3 bg-destructive/15 border border-destructive/30 rounded-lg text-destructive text-sm">{wizardError}</div>
                  )}

                  {/* Step 1 */}
                  {wizardStep === 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Course</label>
                        <select value={selectedCourse} onChange={(e) => void handleCourseSelect(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground">
                          <option value="">Select a course...</option>
                          {courses.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Class Day (optional)</label>
                          <select value={classDay} onChange={(e) => setClassDay(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                            <option value="">No class day</option>
                            {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Start Time</label>
                          <input type="time" value={classStartTime} onChange={(e) => setClassStartTime(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">End Time</label>
                          <input type="time" value={classEndTime} onChange={(e) => setClassEndTime(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                        </div>
                      </div>
                      {selectedCourse && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-foreground">Topics ({selectedTopics.size} selected)</label>
                            {availableTopics.length > 0 && (
                              <button onClick={selectAllTopics} className="text-xs text-primary hover:text-primary/80 font-medium">
                                {selectedTopics.size === availableTopics.length ? "Deselect All" : "Select All"}
                              </button>
                            )}
                          </div>
                          {topicsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              <span className="ml-3 text-sm text-muted-foreground">Analyzing course materials...</span>
                            </div>
                          ) : availableTopics.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">No topics found. Make sure the course has ingested materials.</div>
                          ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {availableTopics.map((topic) => (
                                <button key={topic.name} onClick={() => toggleTopic(topic.name)}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                                    selectedTopics.has(topic.name) ? "bg-primary/10 border border-primary/30" : "bg-secondary/20 border border-transparent hover:bg-secondary/40"
                                  }`}>
                                  <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                    selectedTopics.has(topic.name) ? "bg-primary border-primary" : "border-border"
                                  }`}>
                                    {selectedTopics.has(topic.name) && (
                                      <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="flex-1 text-foreground">{topic.name}</span>
                                  {topic.week && <span className="text-xs text-muted-foreground">Week {topic.week}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Step 2 */}
                  {wizardStep === 1 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Your AI-generated study plan. Reorder, remove, or adjust before confirming.
                      </p>
                      <div className="space-y-2">
                        {planItems.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-secondary/20 border border-border/50 group">
                            <span className="text-lg mt-0.5 shrink-0">{item.item_type === "quiz" ? "📝" : "📖"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground text-sm">{item.topic_name}</span>
                                {item.item_type === "quiz" && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 uppercase">Quiz</span>
                                )}
                              </div>
                              {item.subtopics.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{item.subtopics.join(" · ")}</p>}
                              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                {item.target_date && <span>{item.target_date}</span>}
                                {item.estimated_hours != null && <span>{item.estimated_hours}h</span>}
                                {item.quiz_config && <span>{item.quiz_config.question_count || 5} questions · {item.quiz_config.difficulty || "medium"}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => movePlanItem(idx, "up")} disabled={idx === 0} className="p-1 rounded hover:bg-secondary disabled:opacity-30" title="Move up">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button onClick={() => movePlanItem(idx, "down")} disabled={idx === planItems.length - 1} className="p-1 rounded hover:bg-secondary disabled:opacity-30" title="Move down">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                              <button onClick={() => removePlanItem(idx)} className="p-1 rounded hover:bg-destructive/20 text-destructive" title="Remove">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {planItems.length === 0 && <div className="py-8 text-center text-muted-foreground text-sm">All items removed. Go back to regenerate.</div>}
                      {planItems.length > 0 && (
                        <div className="flex gap-4 text-sm text-muted-foreground bg-secondary/10 rounded-lg px-4 py-3">
                          <span>{planItems.length} items</span>
                          <span>{planItems.filter((i) => i.item_type === "study_session").length} study sessions</span>
                          <span>{planItems.filter((i) => i.item_type === "quiz").length} quizzes</span>
                          <span>{planItems.reduce((s, i) => s + (i.estimated_hours || 0), 0).toFixed(1)}h total</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Step 3 */}
                  {wizardStep === 2 && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Curriculum Title</label>
                        <input type="text" value={curriculumTitle} onChange={(e) => setCurriculumTitle(e.target.value)}
                          placeholder={`${selectedCourse.toUpperCase()} Study Plan`}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground" />
                      </div>
                      <Card className="p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Summary</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Course:</span> <span className="text-foreground font-medium">{selectedCourse.toUpperCase()}</span></div>
                          <div><span className="text-muted-foreground">Items:</span> <span className="text-foreground font-medium">{planItems.length}</span></div>
                          <div><span className="text-muted-foreground">Study Sessions:</span> <span className="text-foreground font-medium">{planItems.filter((i) => i.item_type === "study_session").length}</span></div>
                          <div><span className="text-muted-foreground">Quizzes:</span> <span className="text-foreground font-medium">{planItems.filter((i) => i.item_type === "quiz").length}</span></div>
                          <div><span className="text-muted-foreground">Total Hours:</span> <span className="text-foreground font-medium">{planItems.reduce((s, i) => s + (i.estimated_hours || 0), 0).toFixed(1)}</span></div>
                          {classDay && <div><span className="text-muted-foreground">Class:</span> <span className="text-foreground font-medium">{classDay} {classStartTime && `${classStartTime}-${classEndTime}`}</span></div>}
                        </div>
                      </Card>
                      <p className="text-sm text-muted-foreground">This will create your curriculum and you can start tracking your progress immediately.</p>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
                  <Button variant="outline" onClick={() => {
                    if (wizardStep === 0) { setWizardOpen(false); resetWizard() }
                    else setWizardStep((s) => (s - 1) as WizardStep)
                  }} disabled={wizardLoading}>
                    {wizardStep === 0 ? "Cancel" : "Back"}
                  </Button>
                  {wizardStep === 0 && (
                    <Button onClick={() => void handleGeneratePlan()} disabled={selectedTopics.size === 0 || !selectedCourse || wizardLoading}>
                      {wizardLoading ? (
                        <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />Generating Plan...</>
                      ) : "Generate Study Plan"}
                    </Button>
                  )}
                  {wizardStep === 1 && (
                    <Button onClick={() => setWizardStep(2)} disabled={planItems.length === 0}>Continue to Confirm</Button>
                  )}
                  {wizardStep === 2 && (
                    <Button onClick={() => void handleCreateCurriculum()} disabled={wizardLoading || !curriculumTitle.trim()}>
                      {wizardLoading ? (
                        <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />Creating...</>
                      ) : "Create Curriculum"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
