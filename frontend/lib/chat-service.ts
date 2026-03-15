import type { Flashcard, PersonaMode, QuizQuestion } from "@/types"

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")

interface AskRequest {
  question: string
  courseId?: string
  token?: string | null
  persona?: PersonaMode
  learningLevel?: "beginner" | "intermediate" | "advanced"
}

export interface SourceInfo {
  file: string
  page?: number | null
  content?: string | null
}

export interface AskResponse {
  answer: string
  sources: SourceInfo[]
  courseId: string
}

type ApiResponse<T> = {
  detail?: string
  message?: string
} & T

async function parseResponse<T = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text()
  let data: ApiResponse<T> | undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      throw new Error("Unexpected response from server")
    }
  }

  if (!response.ok) {
    const message = (data as ApiResponse<T> | undefined)?.detail || data?.message || response.statusText
    throw new Error(message || "Request failed")
  }

  return (data || ({} as T)) as T
}

function authHeaders(token?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function buildPersonaPrompt(persona: PersonaMode | undefined, level: AskRequest["learningLevel"]) {
  if (!persona && !level) return ""
  const parts: string[] = []
  if (level) {
    parts.push(`Learning level: ${level}`)
  }
  if (persona) {
    const personaGuidance: Record<PersonaMode, string> = {
      standard: "Provide clear, structured tutoring with step-by-step guidance.",
      advocate: "Challenge assumptions and explore counter-arguments before concluding.",
      joker: "Keep tone light and memorable while staying accurate.",
      socratic: "Prefer asking guiding questions that help the student derive the answer.",
    }
    parts.push(`Persona: ${personaGuidance[persona]}`)
  }
  return parts.length ? `\n\n${parts.join(" \n")}` : ""
}

export async function askQuestion({
  question,
  courseId = "sc2107",
  token,
  persona,
  learningLevel,
}: AskRequest): Promise<AskResponse> {
  const response = await fetch(`${API_BASE_URL}/rag/ask`, {
    method: "POST",
    headers: authHeaders(token ?? undefined),
    body: JSON.stringify({
      question: `${question}${buildPersonaPrompt(persona, learningLevel)}`,
      course_id: courseId,
    }),
  })

  const data = await parseResponse<{
    answer: string
    sources: SourceInfo[]
    course_id: string
  }>(response)

  return {
    answer: data.answer,
    sources: data.sources || [],
    courseId: data.course_id,
  }
}


export async function fetchFlashcards(
  courseId: string,
  topic?: string,
  count = 5,
  token?: string | null,
): Promise<Flashcard[]> {
  const response = await fetch(`${API_BASE_URL}/content/flashcards`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ course_id: courseId, topic: topic || null, count }),
  })
  const data = await parseResponse<{ flashcards: Flashcard[] }>(response)
  return data.flashcards || []
}

export async function fetchQuiz(
  courseId: string,
  topic?: string,
  count = 5,
  token?: string | null,
): Promise<QuizQuestion[]> {
  const response = await fetch(`${API_BASE_URL}/content/quiz`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ course_id: courseId, topic: topic || null, count }),
  })
  const data = await parseResponse<{ questions: QuizQuestion[] }>(response)
  return data.questions || []
}

export async function fetchSummary(
  courseId: string,
  topic?: string,
  token?: string | null,
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/content/summary`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ course_id: courseId, topic: topic || null }),
  })
  const data = await parseResponse<{ summary: string }>(response)
  return data.summary || ""
}

export async function fetchCourses(token?: string | null): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/rag/courses`, {
    headers: authHeaders(token),
  })
  const data = await parseResponse<{ courses: string[] }>(response)
  return data.courses || []
}

export async function uploadDocuments(
  courseId: string,
  files: File[],
  category: string,
  autoIngest: boolean,
  token?: string | null,
): Promise<{ message: string; files: string[]; course_id: string }> {
  const form = new FormData()
  for (const f of files) form.append("files", f)
  form.append("category", category)
  form.append("auto_ingest", String(autoIngest))

  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}/documents/upload/${encodeURIComponent(courseId)}`, {
    method: "POST",
    headers,
    body: form,
  })
  return parseResponse(response)
}

export async function listDocuments(
  courseId: string,
  token?: string | null,
): Promise<{ course_id: string; category: string; documents: { filename: string; size: number; type: string }[] }> {
  const response = await fetch(`${API_BASE_URL}/documents/list/${encodeURIComponent(courseId)}`, {
    headers: authHeaders(token),
  })
  return parseResponse(response)
}

export async function getIndexingStatus(
  courseId: string,
  token?: string | null,
): Promise<{ course_id: string; status: string; document_count: number; indexed: boolean; category: string }> {
  const response = await fetch(`${API_BASE_URL}/indexing/status/${encodeURIComponent(courseId)}`, {
    headers: authHeaders(token),
  })
  return parseResponse(response)
}

export async function buildIndex(
  courseId: string,
  forceRebuild = false,
  token?: string | null,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/indexing/build`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ course_id: courseId, force_rebuild: forceRebuild }),
  })
  return parseResponse(response)
}

export async function logEvent(
  payload: {
    email: string; course_id: string; event_type: string;
    topic?: string; quiz_id?: string; question_index?: number;
    score?: number; total?: number; duration_seconds?: number; detail?: string;
  },
  token?: string | null,
): Promise<void> {
  await fetch(`${API_BASE_URL}/analytics/event`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export async function fetchAnalyticsOverview(
  courseId?: string,
  days = 30,
  token?: string | null,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ days: String(days) })
  if (courseId) params.set("course_id", courseId)
  const response = await fetch(`${API_BASE_URL}/analytics/overview?${params}`, {
    headers: authHeaders(token),
  })
  return parseResponse(response)
}

export async function fetchStudentAnalytics(
  courseId?: string,
  days = 30,
  token?: string | null,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ days: String(days) })
  if (courseId) params.set("course_id", courseId)
  const response = await fetch(`${API_BASE_URL}/analytics/students?${params}`, {
    headers: authHeaders(token),
  })
  return parseResponse(response)
}

export async function fetchTopicAnalytics(
  courseId?: string,
  days = 30,
  token?: string | null,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ days: String(days) })
  if (courseId) params.set("course_id", courseId)
  const response = await fetch(`${API_BASE_URL}/analytics/topics?${params}`, {
    headers: authHeaders(token),
  })
  return parseResponse(response)
}

export async function fetchEngagementAnalytics(
  courseId?: string,
  days = 30,
  token?: string | null,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ days: String(days) })
  if (courseId) params.set("course_id", courseId)
  const response = await fetch(`${API_BASE_URL}/analytics/engagement?${params}`, {
    headers: authHeaders(token),
  })
  return parseResponse(response)
}

export async function fetchAlerts(
  courseId?: string,
  days = 14,
  token?: string | null,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ days: String(days) })
  if (courseId) params.set("course_id", courseId)
  const response = await fetch(`${API_BASE_URL}/analytics/alerts?${params}`, {
    headers: authHeaders(token),
  })
  return parseResponse(response)
}
