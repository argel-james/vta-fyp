"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { CurriculumRecord, CurriculumTopicItem } from "@/lib/chat-service"

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_NAME_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

const STATUS_DOTS: Record<string, string> = {
  not_started: "bg-gray-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  skipped: "bg-orange-400",
}

const QUICK_ACTIONS = [
  { icon: "💬", label: "Chat", href: "/chat", param: "prompt", makeValue: (t: string) => `Explain ${t}` },
  { icon: "🧠", label: "Quiz", href: "/learn", param: "topic" },
  { icon: "🧙‍♂️", label: "Socratic", href: "/socratic", param: "topic" },
  { icon: "🗺️", label: "Map", href: "/concept-map", param: "topic" },
  { icon: "🎓", label: "Teach", href: "/teach-back", param: "topic" },
]

interface CalendarEvent {
  topic: CurriculumTopicItem
  curriculum: CurriculumRecord
  date: Date
}

function parseDayFromTargetDate(targetDate: string): string | null {
  const match = targetDate.match(/,\s*(\w+)\s*$/i)
  return match ? match[1].toLowerCase() : null
}

function parseWeekAndDay(targetDate: string): { week: number; dayName: string | null } | null {
  const weekMatch = targetDate.match(/week\s*(\d+)/i)
  if (!weekMatch) return null
  const week = parseInt(weekMatch[1], 10)
  const dayName = parseDayFromTargetDate(targetDate)
  return { week, dayName }
}

function resolveDate(
  targetDate: string | null,
  createdAt: string,
  classDayName: string | null,
  itemIndex: number,
): Date | null {
  if (!targetDate) return null

  const parsed = parseWeekAndDay(targetDate)
  if (!parsed) return null

  const baseDate = new Date(createdAt)
  baseDate.setHours(0, 0, 0, 0)

  const startOfWeek = new Date(baseDate)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)

  const targetWeekStart = new Date(startOfWeek)
  targetWeekStart.setDate(targetWeekStart.getDate() + (parsed.week - 1) * 7)

  if (parsed.dayName && DAY_NAME_MAP[parsed.dayName] !== undefined) {
    const dayOffset = DAY_NAME_MAP[parsed.dayName]
    const adjustedOffset = dayOffset === 0 ? 6 : dayOffset - 1
    const result = new Date(targetWeekStart)
    result.setDate(result.getDate() + adjustedOffset)
    return result
  }

  if (classDayName) {
    const classDayNum = DAY_NAME_MAP[classDayName.toLowerCase()]
    if (classDayNum !== undefined) {
      const adjustedOffset = classDayNum === 0 ? 6 : classDayNum - 1
      const result = new Date(targetWeekStart)
      result.setDate(result.getDate() + adjustedOffset)
      return result
    }
  }

  const result = new Date(targetWeekStart)
  result.setDate(result.getDate() + (itemIndex % 5))
  return result
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function buildDeepLink(action: typeof QUICK_ACTIONS[number], courseId: string, topicName: string) {
  const params = new URLSearchParams({ course: courseId })
  if (action.makeValue) {
    params.set(action.param, action.makeValue(topicName))
  } else {
    params.set(action.param, topicName)
  }
  return `${action.href}?${params.toString()}`
}

interface CurriculumCalendarProps {
  curricula: CurriculumRecord[]
  onStatusChange: (curriculumId: number, topicId: number, status: string) => void
}

export function CurriculumCalendar({ curricula, onStatusChange }: CurriculumCalendarProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month")
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - d.getDay())
    return d
  })

  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = []
    for (const curr of curricula) {
      for (let i = 0; i < curr.topics.length; i++) {
        const topic = curr.topics[i]
        const date = resolveDate(
          topic.target_date,
          curr.created_at,
          curr.class_day,
          i,
        )
        if (date) {
          events.push({ topic, curriculum: curr, date })
        }
      }
    }
    return events
  }, [curricula])

  const classEvents = useMemo(() => {
    const events: Array<{ curriculum: CurriculumRecord; dayOfWeek: number }> = []
    for (const curr of curricula) {
      if (curr.class_day) {
        const dayNum = DAY_NAME_MAP[curr.class_day.toLowerCase()]
        if (dayNum !== undefined) {
          events.push({ curriculum: curr, dayOfWeek: dayNum })
        }
      }
    }
    return events
  }, [curricula])

  // Month view grid
  const monthGrid = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const cells: Array<{ date: Date; isCurrentMonth: boolean }> = []

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      cells.push({ date: d, isCurrentMonth: false })
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
    }
    const remaining = 7 - (cells.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
      }
    }

    return cells
  }, [currentMonth])

  // Week view grid
  const weekGrid = useMemo(() => {
    const cells: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      cells.push(d)
    }
    return cells
  }, [weekStart])

  function getEventsForDate(date: Date): CalendarEvent[] {
    return calendarEvents.filter((e) => isSameDay(e.date, date))
  }

  function getClassForDate(date: Date): CurriculumRecord | null {
    const dayOfWeek = date.getDay()
    const ce = classEvents.find((e) => e.dayOfWeek === dayOfWeek)
    return ce ? ce.curriculum : null
  }

  function prevMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }
  function goToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    const d = new Date(today)
    d.setDate(d.getDate() - d.getDay())
    setWeekStart(d)
  }
  function prevWeek() {
    setWeekStart((w) => {
      const d = new Date(w)
      d.setDate(d.getDate() - 7)
      return d
    })
  }
  function nextWeek() {
    setWeekStart((w) => {
      const d = new Date(w)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const weekLabel = (() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `${fmt(weekStart)} – ${fmt(end)}, ${end.getFullYear()}`
  })()

  function truncateLabel(text: string, max: number) {
    return text.length > max ? text.slice(0, max - 1) + "…" : text
  }

  const renderEventPill = (ev: CalendarEvent, compact = false) => {
    const statusDot = STATUS_DOTS[ev.topic.status] || "bg-gray-400"
    const isQuiz = ev.topic.item_type === "quiz"
    const label = compact
      ? truncateLabel(`${isQuiz ? "Quiz" : "Study"}: ${ev.topic.topic_name}`, 22)
      : `${isQuiz ? "Quiz" : "Study"}: ${ev.topic.topic_name}`

    return (
      <button
        key={`${ev.curriculum.id}-${ev.topic.id}`}
        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
        className="w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate hover:bg-secondary/40 transition-colors flex items-center gap-1"
        title={`${ev.topic.topic_name} (${ev.topic.estimated_hours || "?"}h)`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
        <span className="truncate text-foreground/80">{label}</span>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={calendarMode === "month" ? prevMonth : prevWeek}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors text-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={calendarMode === "month" ? nextMonth : nextWeek}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors text-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <Button variant="outline" size="sm" onClick={goToday}>today</Button>
          </div>

          <h3 className="text-lg font-bold text-foreground">
            {calendarMode === "month" ? monthLabel : weekLabel}
          </h3>

          <div className="flex bg-secondary/30 rounded-lg p-0.5">
            <button onClick={() => setCalendarMode("month")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${calendarMode === "month" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              month
            </button>
            <button onClick={() => setCalendarMode("week")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${calendarMode === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              week
            </button>
          </div>
        </div>
      </Card>

      {/* Month view */}
      {calendarMode === "month" && (
        <Card className="overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAY_NAMES_SHORT.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {monthGrid.map((cell, idx) => {
              const events = getEventsForDate(cell.date)
              const classCurr = getClassForDate(cell.date)
              const isToday = isSameDay(cell.date, today)

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-r border-b border-border last:border-r-0 p-1 transition-colors ${
                    cell.isCurrentMonth ? "bg-card" : "bg-muted/30"
                  } ${isToday ? "ring-2 ring-inset ring-primary/40" : ""}`}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-0.5">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : cell.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                    }`}>
                      {cell.date.getDate()}
                    </span>
                  </div>

                  {/* Class event */}
                  {classCurr && cell.isCurrentMonth && (
                    <div className="px-1.5 py-0.5 mb-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 truncate font-medium">
                      {classCurr.class_start_time || ""} {classCurr.course_id.toUpperCase()} Class
                    </div>
                  )}

                  {/* Study events */}
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((ev) => renderEventPill(ev, true))}
                    {events.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1.5">+{events.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Week view */}
      {calendarMode === "week" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {weekGrid.map((date, i) => {
              const isToday = isSameDay(date, today)
              return (
                <div key={i} className="px-2 py-2 text-center border-r border-border last:border-r-0">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">{DAY_NAMES_SHORT[date.getDay()]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${
                    isToday ? "text-primary" : "text-foreground"
                  }`}>
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7">
            {weekGrid.map((date, i) => {
              const events = getEventsForDate(date)
              const classCurr = getClassForDate(date)
              const isToday = isSameDay(date, today)

              return (
                <div key={i} className={`min-h-[200px] border-r border-border last:border-r-0 p-2 ${
                  isToday ? "bg-primary/5" : "bg-card"
                }`}>
                  {classCurr && (
                    <div className="px-2 py-1.5 mb-1.5 rounded-md text-xs bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium">
                      <div>{classCurr.course_id.toUpperCase()} Class</div>
                      {classCurr.class_start_time && (
                        <div className="text-[10px] opacity-70">{classCurr.class_start_time} – {classCurr.class_end_time}</div>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    {events.map((ev) => {
                      const statusDot = STATUS_DOTS[ev.topic.status] || "bg-gray-400"
                      const isQuiz = ev.topic.item_type === "quiz"
                      return (
                        <button
                          key={`${ev.curriculum.id}-${ev.topic.id}`}
                          onClick={() => setSelectedEvent(ev)}
                          className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-secondary/40 transition-colors border border-border/50"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                            <span className="font-medium text-foreground truncate">
                              {isQuiz ? "📝 Quiz" : "📖 Study"}: {ev.topic.topic_name}
                            </span>
                          </div>
                          {ev.topic.estimated_hours != null && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 ml-3.5">
                              {ev.topic.estimated_hours}h estimated
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
        {Object.entries(STATUS_DOTS).map(([status, dotClass]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span className="capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-indigo-500/40" />
          <span>Class</span>
        </div>
      </div>

      {/* Event detail popover */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedEvent(null)} />
          <Card className="relative z-10 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{selectedEvent.topic.item_type === "quiz" ? "📝" : "📖"}</span>
                  <h3 className="text-lg font-bold text-foreground">{selectedEvent.topic.topic_name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.curriculum.course_id.toUpperCase()} · {selectedEvent.curriculum.title}
                </p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1.5 hover:bg-secondary rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="text-foreground font-medium">
                  {selectedEvent.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Hours:</span>{" "}
                <span className="text-foreground font-medium">{selectedEvent.topic.estimated_hours || "—"}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>{" "}
                <span className="text-foreground font-medium capitalize">{selectedEvent.topic.item_type.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <select
                  value={selectedEvent.topic.status}
                  onChange={(e) => {
                    onStatusChange(selectedEvent.curriculum.id, selectedEvent.topic.id, e.target.value)
                    setSelectedEvent(null)
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer ${
                    STATUS_DOTS[selectedEvent.topic.status]?.replace("bg-", "text-") || ""
                  }`}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
            </div>

            {selectedEvent.topic.subtopics.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Subtopics:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedEvent.topic.subtopics.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-secondary/40 text-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick action links */}
            <div>
              <span className="text-sm text-muted-foreground">Jump to:</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.label}
                    href={buildDeepLink(action, selectedEvent.curriculum.course_id, selectedEvent.topic.topic_name)}
                    onClick={() => setSelectedEvent(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/30 hover:bg-secondary/50 transition-colors text-foreground"
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
