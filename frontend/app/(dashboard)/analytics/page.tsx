"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
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

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
}

function EmptyState({ message, loading }: { message: string; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading..." : message}
        </p>
      </CardContent>
    </Card>
  )
}

function KpiCard({ label, value, subtitle, icon, trend }: {
  label: string
  value: string | number
  subtitle?: string
  icon: string
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
            {icon}
          </div>
        </div>
        {trend && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        )}
      </CardContent>
    </Card>
  )
}

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { token } = useAuth()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>("overview")
  const [courses, setCourses] = useState<string[]>([])
  const [courseId, setCourseId] = useState(searchParams.get("course") || "")
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const coursesLoaded = useRef(false)

  const [overview, setOverview] = useState<Record<string, any> | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [engagement, setEngagement] = useState<Record<string, any> | null>(null)
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    if (coursesLoaded.current) return
    fetchCourses(token).then((c) => {
      setCourses(c)
      coursesLoaded.current = true
      if (!courseId && c.length > 0) setCourseId(c[0])
    }).catch(() => {})
  }, [token, courseId])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const cid = courseId || undefined
    const errors: string[] = []

    const [ovResult, stResult, tpResult, enResult, alResult] = await Promise.allSettled([
      fetchAnalyticsOverview(cid, days, token),
      fetchStudentAnalytics(cid, days, token),
      fetchTopicAnalytics(cid, days, token),
      fetchEngagementAnalytics(cid, days, token),
      fetchAlerts(cid, days, token),
    ])

    if (ovResult.status === "fulfilled") setOverview(ovResult.value)
    else { errors.push("overview"); setOverview(null) }

    if (stResult.status === "fulfilled") setStudents((stResult.value as any).students || [])
    else { errors.push("students"); setStudents([]) }

    if (tpResult.status === "fulfilled") setTopics((tpResult.value as any).topics || [])
    else { errors.push("topics"); setTopics([]) }

    if (enResult.status === "fulfilled") setEngagement(enResult.value)
    else { errors.push("engagement"); setEngagement(null) }

    if (alResult.status === "fulfilled") setAlerts((alResult.value as any).at_risk_students || [])
    else { errors.push("alerts"); setAlerts([]) }

    if (errors.length > 0) setError(`Failed to load: ${errors.join(", ")}`)
    setLoading(false)
  }, [courseId, days, token])

  useEffect(() => { void loadData() }, [loadData])

  // ---- derived chart data ----

  const dauData = useMemo(() => {
    if (!engagement?.dau) return []
    return Object.entries(engagement.dau as Record<string, number>)
      .slice(-30)
      .map(([date, users]) => ({ date: date.slice(5), users }))
  }, [engagement])

  const wauData = useMemo(() => {
    if (!engagement?.wau) return []
    return Object.entries(engagement.wau as Record<string, number>)
      .map(([week, users]) => ({ week: week.slice(5), users }))
  }, [engagement])

  const funnelData = useMemo(() => {
    if (!engagement?.funnel) return []
    return (engagement.funnel as any[]).map((s: any) => ({
      step: s.step.replace(/_/g, " "),
      count: s.count,
    }))
  }, [engagement])

  const eventBreakdownData = useMemo(() => {
    if (!engagement?.event_counts) return []
    return Object.entries(engagement.event_counts as Record<string, number>)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
  }, [engagement])

  const topicRadarData = useMemo(() => {
    return topics.slice(0, 8).map((t: any) => ({
      topic: t.topic.length > 12 ? t.topic.slice(0, 12) + "…" : t.topic,
      "Failure Rate": t.failure_rate,
      "Avg Score": t.avg_score ?? 0,
    }))
  }, [topics])

  const riskDistribution = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 }
    students.forEach((s: any) => {
      if (s.risk_level in counts) counts[s.risk_level as keyof typeof counts]++
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [students])

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "students", label: "Students", icon: "👥" },
    { key: "topics", label: "Topics", icon: "📚" },
    { key: "engagement", label: "Engagement", icon: "📈" },
    { key: "alerts", label: "Alerts", icon: "🚨" },
  ]

  const riskBadge = (level: string) => {
    const cls: Record<string, string> = {
      high: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
      medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      low: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20",
    }
    return `px-2.5 py-0.5 text-xs font-semibold rounded-full border ${cls[level] || cls.low}`
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-7xl px-6 py-8 space-y-6">

          {/* ===== HEADER ===== */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">Real-time insights into student performance and engagement</p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm min-w-[140px]"
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
              <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}
                className="min-w-[90px]">
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Loading
                  </span>
                ) : "Refresh"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              {error}. Some sections may show stale or empty data.
            </div>
          )}

          {/* ===== TABS ===== */}
          <div className="flex gap-1 border-b border-border pb-px overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
                {t.key === "alerts" && alerts.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white font-bold">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ===== OVERVIEW TAB ===== */}
          {tab === "overview" && (
            <div className="space-y-6">
              {loading && !overview ? (
                <EmptyState message="" loading />
              ) : !overview ? (
                <EmptyState message="No overview data available for this period." />
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <KpiCard label="Total Students" value={overview.total_students ?? 0} icon="👥" trend="neutral" />
                    <KpiCard label="Active Students" value={overview.active_students ?? 0} icon="✅"
                      subtitle={overview.total_students ? `${Math.round((overview.active_students / overview.total_students) * 100)}% of total` : undefined}
                      trend="up" />
                    <KpiCard label="At-Risk" value={overview.at_risk_students ?? 0} icon="⚠️" trend="down" />
                    <KpiCard label="Avg Score" value={`${overview.average_score ?? 0}%`} icon="🎯" trend="neutral" />
                    <KpiCard label="Hardest Topic" value={overview.hardest_topic || "—"} icon="🔥" />
                    <KpiCard label="Total Queries" value={overview.total_queries ?? 0} icon="💬" trend="up" />
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* DAU Area Chart */}
                    {dauData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Daily Active Users</CardTitle>
                          <CardDescription>Unique users per day (last 30 days)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={dauData}>
                              <defs>
                                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                                  <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground"
                                interval="preserveStartEnd" />
                              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Area type="monotone" dataKey="users" name="Active Users"
                                stroke={CHART_COLORS[0]} strokeWidth={2.5}
                                fill="url(#dauGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Learning Funnel Bar */}
                    {funnelData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Learning Funnel</CardTitle>
                          <CardDescription>Drop-off from lessons to quiz completion</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={funnelData} layout="vertical"
                              margin={{ left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                              <YAxis dataKey="step" type="category" tick={{ fontSize: 12 }}
                                className="text-muted-foreground capitalize" width={110} />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]} barSize={28}>
                                {funnelData.map((_entry, i) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Risk Donut (overview) */}
                  {riskDistribution.length > 0 && (
                    <div className="grid lg:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Risk Distribution</CardTitle>
                          <CardDescription>Student risk breakdown</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie data={riskDistribution} cx="50%" cy="50%"
                                innerRadius={55} outerRadius={80}
                                paddingAngle={4} dataKey="value"
                                strokeWidth={0}>
                                {riskDistribution.map((entry) => (
                                  <Cell key={entry.name} fill={RISK_COLORS[entry.name] || CHART_COLORS[0]} />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend formatter={(v: string) => <span className="text-xs capitalize text-foreground">{v}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {topicRadarData.length >= 3 && (
                        <Card className="lg:col-span-2">
                          <CardHeader>
                            <CardTitle className="text-base">Topic Performance Radar</CardTitle>
                            <CardDescription>Failure rate vs avg score across topics</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                              <RadarChart data={topicRadarData}>
                                <PolarGrid className="stroke-border" />
                                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10 }}
                                  className="text-muted-foreground" />
                                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                                <Radar name="Failure Rate" dataKey="Failure Rate"
                                  stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                                <Radar name="Avg Score" dataKey="Avg Score"
                                  stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend formatter={(v: string) => <span className="text-xs text-foreground">{v}</span>} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== STUDENTS TAB ===== */}
          {tab === "students" && (
            <div className="space-y-6">
              {loading && students.length === 0 ? (
                <EmptyState message="" loading />
              ) : students.length === 0 ? (
                <EmptyState message="No student data for this period yet." />
              ) : (
                <>
                  {/* Score distribution chart */}
                  {(() => {
                    const buckets = [
                      { range: "0-20%", count: 0 }, { range: "21-40%", count: 0 },
                      { range: "41-60%", count: 0 }, { range: "61-80%", count: 0 },
                      { range: "81-100%", count: 0 },
                    ]
                    students.forEach((s: any) => {
                      if (s.avg_score === null) return
                      const idx = Math.min(Math.floor(s.avg_score / 20), 4)
                      buckets[idx].count++
                    })
                    const hasScores = buckets.some(b => b.count > 0)

                    return hasScores ? (
                      <div className="grid lg:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Score Distribution</CardTitle>
                            <CardDescription>Number of students by avg quiz score range</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={buckets}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="range" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" name="Students" radius={[6, 6, 0, 0]} barSize={36}>
                                  {buckets.map((_b, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {riskDistribution.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Risk Breakdown</CardTitle>
                              <CardDescription>{students.length} students total</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center">
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie data={riskDistribution} cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={80}
                                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                                    {riskDistribution.map((entry) => (
                                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] || CHART_COLORS[0]} />
                                    ))}
                                  </Pie>
                                  <Tooltip content={<ChartTooltipContent />} />
                                  <Legend formatter={(v: string) => <span className="text-xs capitalize text-foreground">{v}</span>} />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : null
                  })()}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Student Performance</CardTitle>
                      <CardDescription>{students.length} students found</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Student</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Queries</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Quizzes</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Avg Score</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Struggled Topics</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Last Active</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Risk</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((s: any) => (
                              <tr key={s.email} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                                <td className="py-3 px-3 text-foreground font-medium">{s.email?.split("@")[0] ?? s.email}</td>
                                <td className="py-3 px-3 text-muted-foreground">{s.total_queries}</td>
                                <td className="py-3 px-3 text-muted-foreground">{s.quiz_count}</td>
                                <td className="py-3 px-3">
                                  {s.avg_score !== null ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full transition-all"
                                          style={{
                                            width: `${Math.min(s.avg_score, 100)}%`,
                                            backgroundColor: s.avg_score >= 70 ? "#22c55e" : s.avg_score >= 50 ? "#eab308" : "#ef4444",
                                          }}
                                        />
                                      </div>
                                      <span className="text-foreground text-xs font-medium">{s.avg_score}%</span>
                                    </div>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(s.weak_topics || []).map((t: string) => (
                                      <span key={t} className="px-1.5 py-0.5 text-xs bg-red-500/10 text-red-600 dark:text-red-400 rounded border border-red-500/20">{t}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-muted-foreground text-xs">
                                  {s.last_active ? new Date(s.last_active).toLocaleDateString() : "—"}
                                  {s.inactive_days !== null && s.inactive_days > 3 && (
                                    <span className="ml-1 text-orange-500 font-medium">({s.inactive_days}d)</span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <span className={riskBadge(s.risk_level)}>{s.risk_level}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ===== TOPICS TAB ===== */}
          {tab === "topics" && (
            <div className="space-y-6">
              {loading && topics.length === 0 ? (
                <EmptyState message="" loading />
              ) : topics.length === 0 ? (
                <EmptyState message="No topic data for this period yet." />
              ) : (
                <>
                  {/* Topic charts */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Failure rate bar chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Topic Failure Rates</CardTitle>
                        <CardDescription>Sorted by difficulty (highest first)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={Math.max(200, topics.length * 36)}>
                          <BarChart data={topics.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }}
                              className="text-muted-foreground" unit="%" />
                            <YAxis dataKey="topic" type="category" width={100}
                              tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="failure_rate" name="Failure %" radius={[0, 6, 6, 0]} barSize={22}>
                              {topics.slice(0, 10).map((t: any, i: number) => (
                                <Cell key={i} fill={t.failure_rate > 50 ? "#ef4444" : t.failure_rate > 25 ? "#eab308" : "#22c55e"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Radar */}
                    {topicRadarData.length >= 3 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Performance Radar</CardTitle>
                          <CardDescription>Failure rate vs score across topics</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={Math.max(200, topics.length * 36)}>
                            <RadarChart data={topicRadarData}>
                              <PolarGrid className="stroke-border" />
                              <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                              <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                              <Radar name="Failure Rate" dataKey="Failure Rate"
                                stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                              <Radar name="Avg Score" dataKey="Avg Score"
                                stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                              <Tooltip content={<ChartTooltipContent />} />
                              <Legend formatter={(v: string) => <span className="text-xs text-foreground">{v}</span>} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Topic Difficulty Heatmap */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Difficulty Heatmap</CardTitle>
                      <CardDescription>Visual difficulty map — red = hardest</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2.5">
                        {topics.map((t: any) => {
                          const intensity = Math.min(t.failure_rate / 100, 1)
                          const bg = intensity > 0.5
                            ? `rgba(239,68,68,${0.3 + intensity * 0.7})`
                            : intensity > 0.25
                              ? `rgba(234,179,8,${0.3 + intensity * 0.7})`
                              : `rgba(34,197,94,${0.3 + intensity * 0.7})`
                          return (
                            <div key={t.topic}
                              className="px-4 py-3 rounded-xl text-xs font-semibold text-white min-w-[90px] text-center shadow-sm transition-transform hover:scale-105"
                              style={{ backgroundColor: bg }}
                              title={`${t.topic}: ${t.failure_rate}% failure rate | ${t.unique_students} students | ${t.query_count} queries`}>
                              {t.topic}
                              <div className="text-[10px] opacity-80 mt-0.5">{t.failure_rate}% fail</div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Topic table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Detailed Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Topic</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Attempts</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Correct</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Failure %</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Avg Score</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Students</th>
                              <th className="text-left py-3 px-3 font-semibold text-foreground">Queries</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topics.map((t: any) => (
                              <tr key={t.topic} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                                <td className="py-3 px-3 text-foreground font-medium">{t.topic}</td>
                                <td className="py-3 px-3 text-muted-foreground">{t.total_attempts}</td>
                                <td className="py-3 px-3 text-green-600 dark:text-green-400 font-medium">{t.correct}</td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${Math.min(t.failure_rate, 100)}%`,
                                          backgroundColor: t.failure_rate > 50 ? "#ef4444" : t.failure_rate > 25 ? "#eab308" : "#22c55e",
                                        }}
                                      />
                                    </div>
                                    <span className="text-foreground text-xs font-medium">{t.failure_rate}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-foreground">{t.avg_score !== null ? `${t.avg_score}%` : "—"}</td>
                                <td className="py-3 px-3 text-muted-foreground">{t.unique_students}</td>
                                <td className="py-3 px-3 text-muted-foreground">{t.query_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ===== ENGAGEMENT TAB ===== */}
          {tab === "engagement" && (
            engagement ? (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <KpiCard label="Total Events" value={engagement.total_events ?? 0} icon="⚡" />
                  <KpiCard label="Total Queries" value={engagement.total_queries ?? 0} icon="💬" />
                  <KpiCard label="Avg Session" value={`${engagement.avg_session_duration_s ?? 0}s`} icon="⏱️" />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* DAU Area */}
                  {dauData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Daily Active Users</CardTitle>
                        <CardDescription>Trend over the selected period</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart data={dauData}>
                            <defs>
                              <linearGradient id="dauGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground"
                              interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="users" name="Active Users"
                              stroke={CHART_COLORS[0]} strokeWidth={2.5}
                              fill="url(#dauGrad2)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* WAU Bar */}
                  {wauData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Weekly Active Users</CardTitle>
                        <CardDescription>Unique users per week</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={wauData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="users" name="Users" radius={[6, 6, 0, 0]} barSize={32}
                              fill={CHART_COLORS[1]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Event Breakdown */}
                {eventBreakdownData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Event Breakdown</CardTitle>
                      <CardDescription>All event types by volume</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={Math.max(200, eventBreakdownData.length * 38)}>
                        <BarChart data={eventBreakdownData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <YAxis dataKey="name" type="category" width={120}
                            tick={{ fontSize: 11 }} className="text-muted-foreground capitalize" />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]} barSize={24}>
                            {eventBreakdownData.map((_entry, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <EmptyState message={loading ? "" : "No engagement data available for this period."} loading={loading} />
            )
          )}

          {/* ===== ALERTS TAB ===== */}
          {tab === "alerts" && (
            <div className="space-y-6">
              {loading && alerts.length === 0 ? (
                <EmptyState message="" loading />
              ) : alerts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-lg font-semibold text-foreground">All Clear</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No at-risk students detected in the last {days} {days === 1 ? "day" : "days"}.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">At-Risk Students</CardTitle>
                      <CardDescription>
                        {alerts.length} student{alerts.length !== 1 ? "s" : ""} flagged within the last {days} {days === 1 ? "day" : "days"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {alerts.map((a: any) => (
                          <div key={a.email}
                            className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-sm shrink-0">
                                  {a.email?.[0]?.toUpperCase() ?? "?"}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground">{a.email}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Last active: {a.last_active ? new Date(a.last_active).toLocaleDateString() : "never"}
                                    {" · "}Quizzes: {a.quiz_count} · Low scores: {a.low_score_count}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {(a.reasons || []).map((r: string) => (
                                  <span key={r}
                                    className="px-2.5 py-1 text-xs rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium border border-red-500/20">
                                    {r.replace(/_/g, " ")}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3 ml-13 text-xs text-muted-foreground pl-[52px]">
                              <span className="font-medium text-foreground">Suggested action: </span>
                              {a.reasons?.includes("inactive") && "Send a check-in message. "}
                              {a.reasons?.includes("repeated_low_scores") && "Schedule a review session. "}
                              {a.reasons?.includes("no_quizzes_taken") && "Encourage quiz participation. "}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
