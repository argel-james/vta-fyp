"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import {
  fetchCourses,
  listDocuments,
  getIndexingStatus,
  uploadDocuments,
  buildIndex,
} from "@/lib/chat-service"

type Tab = "upload" | "status" | "personas" | "analytics"

interface DocFile {
  filename: string
  size: number
  type: string
}

interface IndexStatus {
  course_id: string
  status: string
  document_count: number
  indexed: boolean
  category: string
}

export default function ProfessorDashboard() {
  const { token } = useAuth()
  const [tab, setTab] = useState<Tab>("upload")

  const [courses, setCourses] = useState<string[]>([])
  const [courseId, setCourseId] = useState("")
  const [newCourseId, setNewCourseId] = useState("")
  const [category, setCategory] = useState("university")
  const [autoIngest, setAutoIngest] = useState(true)

  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState("")
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docs, setDocs] = useState<DocFile[]>([])
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [buildingIndex, setBuildingIndex] = useState(false)

  const [personas, setPersonas] = useState([
    { id: "standard", name: "Standard", description: "Clear, structured explanations", enabled: true },
    { id: "advocate", name: "Devil's Advocate", description: "Challenges assumptions and encourages critical thinking", enabled: true },
    { id: "joker", name: "Joker", description: "Makes learning fun with humor", enabled: true },
    { id: "socratic", name: "Socratic", description: "Guides through thoughtful questions", enabled: false },
  ])

  useEffect(() => {
    fetchCourses(token).then((c) => {
      setCourses(c)
      if (c.length > 0 && !courseId) setCourseId(c[0])
    }).catch(() => {})
  }, [token, courseId])

  const effectiveCourse = newCourseId.trim() || courseId

  const refreshStatus = useCallback(async () => {
    if (!effectiveCourse) return
    setStatusLoading(true)
    try {
      const [docResult, status] = await Promise.all([
        listDocuments(effectiveCourse, token),
        getIndexingStatus(effectiveCourse, token),
      ])
      setDocs(docResult.documents)
      setIndexStatus(status)
    } catch {
      setDocs([])
      setIndexStatus(null)
    } finally {
      setStatusLoading(false)
    }
  }, [effectiveCourse, token])

  useEffect(() => {
    if (tab === "status") void refreshStatus()
  }, [tab, refreshStatus])

  const handleUpload = async () => {
    const input = fileInputRef.current
    if (!input?.files?.length || !effectiveCourse) return

    setUploading(true)
    setUploadMsg("")
    setUploadError("")

    try {
      const files = Array.from(input.files)
      const result = await uploadDocuments(effectiveCourse, files, category, autoIngest, token)
      setUploadMsg(`${result.message}. Files: ${result.files.join(", ")}`)
      input.value = ""
      fetchCourses(token).then(setCourses).catch(() => {})
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleRebuild = async () => {
    if (!effectiveCourse) return
    setBuildingIndex(true)
    try {
      await buildIndex(effectiveCourse, true, token)
      setTimeout(() => void refreshStatus(), 3000)
    } catch {
      /* ignore */
    } finally {
      setBuildingIndex(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "upload", label: "Upload Materials" },
    { key: "status", label: "Ingestion Status" },
    { key: "personas", label: "Class Personas" },
    { key: "analytics", label: "Analytics" },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex min-h-full bg-gradient-to-br from-background via-background to-secondary/5">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm sticky top-0 h-screen">
          <div className="p-4 space-y-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                  tab === t.key ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Professor Dashboard</h1>
            <p className="text-muted-foreground">Manage course materials, ingestion, personas, and analytics</p>
          </div>

          {/* Course Selector */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Existing Course</label>
                <select
                  value={courseId}
                  onChange={(e) => { setCourseId(e.target.value); setNewCourseId("") }}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  {courses.length === 0 && <option value="">No courses yet</option>}
                  {courses.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Or Create New</label>
                <input
                  type="text"
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="e.g. cs101"
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm w-40"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Active: <span className="font-semibold text-foreground">{effectiveCourse.toUpperCase() || "—"}</span>
              </div>
            </div>
          </Card>

          {/* Upload Tab */}
          {tab === "upload" && (
            <Card className="p-6 space-y-5">
              <h2 className="text-xl font-semibold text-foreground">Upload Course Materials</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">Category / Label</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                  >
                    <option value="university">University</option>
                    <option value="kindergarten">Kindergarten</option>
                    <option value="primary">Primary School</option>
                    <option value="secondary">Secondary School</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoIngest}
                      onChange={(e) => setAutoIngest(e.target.checked)}
                      className="accent-primary w-4 h-4"
                    />
                    Auto-ingest after upload
                  </label>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="w-10 h-10 mx-auto mb-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-muted-foreground mb-2">Drag & drop or click to select files</p>
                <p className="text-xs text-muted-foreground">Supported: PDF, DOCX, PPTX, MD, TXT</p>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.pptx,.ppt,.md,.txt" className="hidden" />
              </div>

              {uploadMsg && <p className="text-sm text-green-600 dark:text-green-400">{uploadMsg}</p>}
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

              <Button onClick={() => void handleUpload()} disabled={uploading || !effectiveCourse}>
                {uploading ? "Uploading..." : "Upload Files"}
              </Button>
            </Card>
          )}

          {/* Ingestion Status Tab */}
          {tab === "status" && (
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Ingestion Status</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={statusLoading}>
                      {statusLoading ? "Loading..." : "Refresh"}
                    </Button>
                    <Button size="sm" onClick={() => void handleRebuild()} disabled={buildingIndex || !effectiveCourse}>
                      {buildingIndex ? "Building..." : "Rebuild Index"}
                    </Button>
                  </div>
                </div>

                {indexStatus && (
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-secondary/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">Course</div>
                      <div className="text-lg font-bold text-foreground">{indexStatus.course_id.toUpperCase()}</div>
                    </div>
                    <div className="p-4 bg-secondary/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className={`text-lg font-bold ${indexStatus.indexed ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                        {indexStatus.indexed ? "Indexed" : "Not Indexed"}
                      </div>
                    </div>
                    <div className="p-4 bg-secondary/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">Documents</div>
                      <div className="text-lg font-bold text-foreground">{indexStatus.document_count}</div>
                    </div>
                    <div className="p-4 bg-secondary/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">Category</div>
                      <div className="text-lg font-bold text-foreground capitalize">{indexStatus.category}</div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Uploaded Files</h3>
                {docs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded for this course yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">File</th>
                          <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Type</th>
                          <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((d) => (
                          <tr key={d.filename} className="border-b border-border/50 hover:bg-secondary/20">
                            <td className="py-2 px-3 text-sm text-foreground">{d.filename}</td>
                            <td className="py-2 px-3 text-sm text-muted-foreground">{d.type}</td>
                            <td className="py-2 px-3 text-sm text-muted-foreground">{formatSize(d.size)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Personas Tab */}
          {tab === "personas" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Class Personas</h2>
              <p className="text-sm text-muted-foreground">
                Enable or disable learning personas for your students.
              </p>
              <div className="space-y-3">
                {personas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    </div>
                    <button
                      onClick={() => setPersonas(personas.map((x) => x.id === p.id ? { ...x, enabled: !x.enabled } : x))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.enabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.enabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Analytics Tab */}
          {tab === "analytics" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Analytics Dashboard</h2>
              <p className="text-sm text-muted-foreground">
                View detailed analytics for student performance, topic mastery, engagement, and at-risk students.
              </p>
              <Link href={`/analytics${effectiveCourse ? `?course=${effectiveCourse}` : ""}`}>
                <Button className="w-full sm:w-auto">Open Full Analytics Dashboard</Button>
              </Link>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
