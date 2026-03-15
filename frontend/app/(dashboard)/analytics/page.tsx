"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import {
  fetchCourses,
  fetchAnalyticsOverview,
  fetchStudentAnalytics,
  fetchTopicAnalytics,
  fetchEngagementAnalytics,
  fetchAlerts,
} from "@/lib/chat-service"

type Tab = "overview" | "students" | "topics" | "engagement" | "alerts"

export default function AnalyticsPage() {
  const { token } = useAuth()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>("overview")
  const [courses, setCourses] = useState<string[]>([])
  const [courseId, setCourseId] = useState(searchParams.get("course") || "")
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const [overview, setOverview] = useState<Record<string, any> | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [engagement, setEngagement] = useState<Record<string, any> | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    fetchCourses(token).then((c) => {
      setCourses(c)
      if (!courseId && c.length > 0) setCourseId(c[0])
    }).catch(() => {})
  }, [token, courseId])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const cid = courseId || undefined
      const [ov, st, tp, en, al] = await Promise.all([
        fetchAnalyticsOverview(cid, days, token),
        fetchStudentAnalytics(cid, days, token),
        fetchTopicAnalytics(cid, days, token),
        fetchEngagementAnalytics(cid, days, token),
        fetchAlerts(cid, Math.min(days, 14), token),
      ])
      setOverview(ov)
      setStudents((st as any).students || [])
      setTopics((tp as any).topics || [])
      setEngagement(en)
      setAlerts((al as any).at_risk_students || [])
    } catch {
      /* silently handle — data may just be empty */
    } finally {
      setLoading(false)
    }
  }, [courseId, days, token])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "students", label: "Students" },
    { key: "topics", label: "Topics" },
    { key: "engagement", label: "Engagement" },
    { key: "alerts", label: "Alerts" },
  ]

  const kpiCards = overview
    ? [
        { label: "Total Students", value: overview.total_students ?? 0, color: "text-blue-600 dark:text-blue-400" },
        { label: "Active Students", value: overview.active_students ?? 0, color: "text-green-600 dark:text-green-400" },
        { label: "At-Risk Students", value: overview.at_risk_students ?? 0, color: "text-red-600 dark:text-red-400" },
        { label: "Avg. Quiz Score", value: `${overview.average_score ?? 0}%`, color: "text-purple-600 dark:text-purple-400" },
        { label: "Hardest Topic", value: overview.hardest_topic || "—", color: "text-orange-600 dark:text-orange-400" },
        { label: "Total Queries", value: overview.total_queries ?? 0, color: "text-cyan-600 dark:text-cyan-400" },
      ]
    : []

  const riskColor = (level: string) => {
    if (level === "high") return "text-red-600 dark:text-red-400 bg-red-500/10"
    if (level === "medium") return "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
    return "text-green-600 dark:text-green-400 bg-green-500/10"
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-7xl px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Student performance, topics, engagement, and alerts</p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">All Courses</option>
                  {courses.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Period</label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-px">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/60 hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {t.label}
                {t.key === "alerts" && alerts.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpiCards.map((kpi) => (
                  <Card key={kpi.label} className="p-4">
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                    <div className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</div>
                  </Card>
                ))}
              </div>

              {/* Queries by day mini chart */}
              {engagement?.dau && Object.keys(engagement.dau).length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Daily Active Users</h3>
                  <div className="flex items-end gap-1 h-32">
                    {Object.entries(engagement.dau as Record<string, number>)
                      .slice(-30)
                      .map(([day, count]) => {
                        const max = Math.max(...Object.values(engagement.dau as Record<string, number>), 1)
                        return (
                          <div key={day} className="flex-1 flex flex-col items-center gap-1" title={`${day}: ${count}`}>
                            <div
                              className="w-full bg-primary/70 rounded-t min-h-[2px] transition-all"
                              style={{ height: `${(count / max) * 100}%` }}
                            />
                          </div>
                        )
                      })}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    {(() => {
                      const keys = Object.keys(engagement.dau as Record<string, number>).slice(-30)
                      return (
                        <>
                          <span>{keys[0]}</span>
                          <span>{keys[keys.length - 1]}</span>
                        </>
                      )
                    })()}
                  </div>
                </Card>
              )}

              {/* Funnel */}
              {engagement?.funnel && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Learning Funnel</h3>
                  <div className="space-y-3">
                    {(engagement.funnel as any[]).map((step: any, idx: number) => {
                      const maxCount = Math.max(...(engagement.funnel as any[]).map((s: any) => s.count), 1)
                      return (
                        <div key={step.step} className="flex items-center gap-3">
                          <div className="w-36 text-sm text-foreground font-medium capitalize">
                            {step.step.replace(/_/g, " ")}
                          </div>
                          <div className="flex-1 h-6 bg-secondary/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full transition-all"
                              style={{ width: `${(step.count / maxCount) * 100}%` }}
                            />
                          </div>
                          <div className="w-12 text-sm text-muted-foreground text-right">{step.count}</div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Students Tab */}
          {tab === "students" && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Student Performance ({students.length} students)
              </h3>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No student data for this period yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Student</th>
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Queries</th>
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Quizzes</th>
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Avg Score</th>
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Weak Topics</th>
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Last Active</th>
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s: any) => (
                        <tr key={s.email} className="border-b border-border/40 hover:bg-secondary/20">
                          <td className="py-2 px-3 text-foreground font-medium">{s.email.split("@")[0]}</td>
                          <td className="py-2 px-3 text-muted-foreground">{s.total_queries}</td>
                          <td className="py-2 px-3 text-muted-foreground">{s.quiz_count}</td>
                          <td className="py-2 px-3 text-foreground">{s.avg_score !== null ? `${s.avg_score}%` : "—"}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {(s.weak_topics || []).map((t: string) => (
                                <span key={t} className="px-1.5 py-0.5 text-xs bg-secondary rounded">{t}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">
                            {s.last_active ? new Date(s.last_active).toLocaleDateString() : "—"}
                            {s.inactive_days !== null && s.inactive_days > 3 && (
                              <span className="ml-1 text-orange-500">({s.inactive_days}d ago)</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${riskColor(s.risk_level)}`}>
                              {s.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Topics Tab */}
          {tab === "topics" && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Topic Performance</h3>
                {topics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topic data for this period yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Topic</th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Attempts</th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Correct</th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Failure %</th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Avg Score</th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Students</th>
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Queries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topics.map((t: any) => (
                          <tr key={t.topic} className="border-b border-border/40 hover:bg-secondary/20">
                            <td className="py-2 px-3 text-foreground font-medium">{t.topic}</td>
                            <td className="py-2 px-3 text-muted-foreground">{t.total_attempts}</td>
                            <td className="py-2 px-3 text-green-600 dark:text-green-400">{t.correct}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${t.failure_rate > 50 ? "bg-red-500" : t.failure_rate > 25 ? "bg-yellow-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.min(t.failure_rate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-foreground text-xs">{t.failure_rate}%</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-foreground">{t.avg_score !== null ? `${t.avg_score}%` : "—"}</td>
                            <td className="py-2 px-3 text-muted-foreground">{t.unique_students}</td>
                            <td className="py-2 px-3 text-muted-foreground">{t.query_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Mastery Heatmap */}
              {topics.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Topic Difficulty Heatmap</h3>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t: any) => {
                      const intensity = Math.min(t.failure_rate / 100, 1)
                      const bg = intensity > 0.5
                        ? `rgba(239,68,68,${intensity})`
                        : intensity > 0.25
                          ? `rgba(234,179,8,${intensity + 0.2})`
                          : `rgba(34,197,94,${0.3 + intensity})`
                      return (
                        <div
                          key={t.topic}
                          className="px-3 py-2 rounded-lg text-xs font-medium text-white min-w-[80px] text-center"
                          style={{ backgroundColor: bg }}
                          title={`Failure rate: ${t.failure_rate}%`}
                        >
                          {t.topic}
                          <div className="text-[10px] opacity-80">{t.failure_rate}% fail</div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Engagement Tab */}
          {tab === "engagement" && engagement && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground">Total Events</div>
                  <div className="text-2xl font-bold text-foreground">{engagement.total_events ?? 0}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground">Total Queries</div>
                  <div className="text-2xl font-bold text-foreground">{engagement.total_queries ?? 0}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground">Avg Session Duration</div>
                  <div className="text-2xl font-bold text-foreground">{engagement.avg_session_duration_s ?? 0}s</div>
                </Card>
              </div>

              {/* Event counts */}
              {engagement.event_counts && Object.keys(engagement.event_counts).length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Event Breakdown</h3>
                  <div className="space-y-2">
                    {Object.entries(engagement.event_counts as Record<string, number>)
                      .sort(([, a], [, b]) => b - a)
                      .map(([event, count]) => {
                        const max = Math.max(...Object.values(engagement.event_counts as Record<string, number>), 1)
                        return (
                          <div key={event} className="flex items-center gap-3">
                            <div className="w-40 text-sm text-foreground capitalize">{event.replace(/_/g, " ")}</div>
                            <div className="flex-1 h-5 bg-secondary/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent/60 rounded-full"
                                style={{ width: `${(count / max) * 100}%` }}
                              />
                            </div>
                            <div className="w-12 text-sm text-muted-foreground text-right">{count}</div>
                          </div>
                        )
                      })}
                  </div>
                </Card>
              )}

              {/* WAU */}
              {engagement.wau && Object.keys(engagement.wau).length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Active Users</h3>
                  <div className="flex items-end gap-2 h-24">
                    {Object.entries(engagement.wau as Record<string, number>).map(([week, count]) => {
                      const max = Math.max(...Object.values(engagement.wau as Record<string, number>), 1)
                      return (
                        <div key={week} className="flex-1 flex flex-col items-center gap-1" title={`${week}: ${count}`}>
                          <div className="text-xs text-muted-foreground">{count}</div>
                          <div
                            className="w-full bg-primary/50 rounded-t min-h-[2px]"
                            style={{ height: `${(count / max) * 100}%` }}
                          />
                          <div className="text-[10px] text-muted-foreground truncate w-full text-center">{week.slice(5)}</div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {tab === "alerts" && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">At-Risk Students</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Students flagged based on inactivity, low scores, or no quiz attempts.
              </p>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-muted-foreground">No at-risk students detected for this period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((a: any) => (
                    <div key={a.email} className="p-4 border border-border rounded-lg hover:bg-secondary/20">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-foreground">{a.email}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Last active: {a.last_active ? new Date(a.last_active).toLocaleDateString() : "never"}
                            {" | "}Quizzes: {a.quiz_count} | Low scores: {a.low_score_count}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(a.reasons || []).map((r: string) => (
                            <span key={r} className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
                              {r.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Recommended: </span>
                        {a.reasons?.includes("inactive") && "Send a check-in message. "}
                        {a.reasons?.includes("repeated_low_scores") && "Schedule a review session or provide supplementary materials. "}
                        {a.reasons?.includes("no_quizzes_taken") && "Encourage quiz participation. "}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
