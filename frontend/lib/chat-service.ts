import type { Flashcard, PersonaMode, QuizQuestion } from "@/types"

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")

interface HistoryMessage {
  role: "user" | "assistant"
  content: string
}

interface AskRequest {
  question: string
  courseId?: string
  token?: string | null
  persona?: PersonaMode
  learningLevel?: "beginner" | "intermediate" | "advanced"
  history?: HistoryMessage[]
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

export async function askQuestion({
  question,
  courseId = "sc2107",
  token,
  persona = "standard",
  learningLevel = "intermediate",
  history,
}: AskRequest): Promise<AskResponse> {
  const body: Record<string, unknown> = {
    question,
    course_id: courseId,
    persona,
    learning_level: learningLevel,
  }
  if (history && history.length > 0) {
    body.history = history
  }

  const response = await fetch(`${API_BASE_URL}/rag/ask`, {
    method: "POST",
    headers: authHeaders(token ?? undefined),
    body: JSON.stringify(body),
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

export interface RegistrationRecord {
  id: number
  email: string
  role: string
  division: string
  status: string
  created_at: string | null
}

export async function fetchRegistrations(
  statusFilter?: string,
  token?: string | null,
): Promise<RegistrationRecord[]> {
  const params = new URLSearchParams()
  if (statusFilter) params.set("status_filter", statusFilter)
  const response = await fetch(`${API_BASE_URL}/auth/registrations?${params}`, {
    headers: authHeaders(token),
  })
  const data = await parseResponse<{ registrations: RegistrationRecord[] }>(response)
  return data.registrations || []
}

export async function decideRegistration(
  requestId: number,
  approve: boolean,
  token?: string | null,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/registrations/decide`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ request_id: requestId, approve }),
  })
  return parseResponse(response)
}

// ─── Media (TTS / STT) ─────────────────────────────────────────────

export async function textToSpeech(
  text: string,
  voice: string = "nova",
  instructions?: string,
  token?: string | null,
): Promise<Blob> {
  const body: Record<string, unknown> = { text, voice }
  if (instructions) body.instructions = instructions
  const response = await fetch(`${API_BASE_URL}/media/tts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(err || "TTS failed")
  }
  return response.blob()
}

export async function speechToText(
  audioBlob: Blob,
  token?: string | null,
): Promise<string> {
  const form = new FormData()
  form.append("file", audioBlob, "recording.webm")
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE_URL}/media/stt`, {
    method: "POST",
    headers,
    body: form,
  })
  const data = await parseResponse<{ text: string }>(response)
  return data.text || ""
}

export async function fetchVoices(token?: string | null): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/media/voices`, {
    headers: authHeaders(token),
  })
  const data = await parseResponse<{ voices: string[] }>(response)
  return data.voices || []
}

// ─── Interactive Learning ───────────────────────────────────────────

export interface SocraticResponse {
  response: string
  metadata: { progress: number; hint_given: boolean; concept_targeted: string }
  course_id: string
  topic: string
}

export async function socraticTutor(
  courseId: string,
  topic: string,
  studentMessage: string,
  history?: HistoryMessage[],
  learningLevel?: string,
  token?: string | null,
): Promise<SocraticResponse> {
  const body: Record<string, unknown> = {
    course_id: courseId,
    topic,
    student_message: studentMessage,
    learning_level: learningLevel || "intermediate",
  }
  if (history && history.length > 0) body.history = history
  const response = await fetch(`${API_BASE_URL}/interactive/socratic`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseResponse(response)
}

export interface TeachBackResponse {
  mastery_score: number
  overall_feedback: string
  correct_points: string[]
  gaps: string[]
  misconceptions: string[]
  suggestions: string[]
  improved_explanation: string
  course_id: string
  topic: string
}

export async function teachItBack(
  courseId: string,
  topic: string,
  explanation: string,
  learningLevel?: string,
  token?: string | null,
): Promise<TeachBackResponse> {
  const response = await fetch(`${API_BASE_URL}/interactive/teach-back`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      course_id: courseId,
      topic,
      student_explanation: explanation,
      learning_level: learningLevel || "intermediate",
    }),
  })
  return parseResponse(response)
}

export interface ScenarioResponse {
  narrative: string
  feedback?: string
  choices: string[]
  scene_number: number
  total_scenes: number
  is_final?: boolean
  score?: number
  concept_being_tested?: string
  concepts_learned?: string[]
  course_id: string
}

export async function scenarioLearning(
  courseId: string,
  topic?: string,
  choice?: string,
  history?: HistoryMessage[],
  learningLevel?: string,
  token?: string | null,
): Promise<ScenarioResponse> {
  const body: Record<string, unknown> = {
    course_id: courseId,
    learning_level: learningLevel || "intermediate",
  }
  if (topic) body.topic = topic
  if (choice) body.choice = choice
  if (history && history.length > 0) body.history = history
  const response = await fetch(`${API_BASE_URL}/interactive/scenario`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseResponse(response)
}

export interface ConceptMapData {
  title: string
  nodes: { id: string; label: string; description: string; category: string; x: number; y: number }[]
  edges: { from: string; to: string; label: string }[]
  course_id: string
  topic?: string
}

export async function generateConceptMap(
  courseId: string,
  topic?: string,
  token?: string | null,
): Promise<ConceptMapData> {
  const response = await fetch(`${API_BASE_URL}/interactive/concept-map`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ course_id: courseId, topic: topic || null }),
  })
  return parseResponse(response)
}

export interface MistakeRevisionData {
  weak_areas: {
    concept: string
    explanation: string
    why_student_struggled: string
    key_points: string[]
    practice_questions: QuizQuestion[]
  }[]
  overall_advice: string
  estimated_mastery: number
  course_id: string
}

export async function revisionFromMistakes(
  courseId: string,
  mistakes: { question: string; student_answer: string; correct_answer: string; topic?: string }[],
  learningLevel?: string,
  token?: string | null,
): Promise<MistakeRevisionData> {
  const response = await fetch(`${API_BASE_URL}/interactive/revision-from-mistakes`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      course_id: courseId,
      mistakes,
      learning_level: learningLevel || "intermediate",
    }),
  })
  return parseResponse(response)
}

export interface IllustratedFlashcard {
  front: string
  back: string
  svg: string
  color: string
}

export async function fetchIllustratedFlashcards(
  courseId: string,
  topic?: string,
  count: number = 4,
  token?: string | null,
): Promise<IllustratedFlashcard[]> {
  const response = await fetch(`${API_BASE_URL}/interactive/illustrated-flashcards`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ course_id: courseId, topic: topic || null, count }),
  })
  const data = await parseResponse<{ flashcards: IllustratedFlashcard[] }>(response)
  return data.flashcards || []
}

// ─── Curriculum ─────────────────────────────────────────────────────

export interface CurriculumTopicItem {
  id: number
  order_index: number
  topic_name: string
  item_type: "study_session" | "quiz"
  subtopics: string[]
  target_date: string | null
  estimated_hours: number | null
  status: "not_started" | "in_progress" | "completed" | "skipped"
  quiz_config: { question_count?: number; difficulty?: string } | null
}

export interface CurriculumRecord {
  id: number
  course_id: string
  title: string
  status: "active" | "completed" | "archived"
  progress_percent: number
  class_day: string | null
  class_start_time: string | null
  class_end_time: string | null
  created_at: string
  topics: CurriculumTopicItem[]
}

export interface CourseTopic {
  name: string
  topic_number: number | null
  week: number | null
  source: string
}

export interface PlanItem {
  item_type: "study_session" | "quiz"
  topic_name: string
  subtopics: string[]
  estimated_hours: number | null
  target_date: string | null
  quiz_config: { question_count?: number; difficulty?: string } | null
  order_index: number
}

export async function fetchCurricula(
  token?: string | null,
): Promise<CurriculumRecord[]> {
  const response = await fetch(`${API_BASE_URL}/curriculum`, {
    headers: authHeaders(token),
  })
  return parseResponse<CurriculumRecord[]>(response)
}

export async function fetchCourseTopics(
  courseId: string,
  token?: string | null,
): Promise<CourseTopic[]> {
  const response = await fetch(`${API_BASE_URL}/curriculum/topics/${encodeURIComponent(courseId)}`, {
    headers: authHeaders(token),
  })
  const data = await parseResponse<{ topics: CourseTopic[] }>(response)
  return data.topics || []
}

export async function generateCurriculumPlan(
  courseId: string,
  selectedTopics: string[],
  classDay?: string | null,
  classStartTime?: string | null,
  classEndTime?: string | null,
  token?: string | null,
): Promise<PlanItem[]> {
  const body: Record<string, unknown> = {
    course_id: courseId,
    selected_topics: selectedTopics,
  }
  if (classDay) body.class_day = classDay
  if (classStartTime) body.class_start_time = classStartTime
  if (classEndTime) body.class_end_time = classEndTime

  const response = await fetch(`${API_BASE_URL}/curriculum/plan`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const data = await parseResponse<{ plan: PlanItem[] }>(response)
  return (data.plan || []).map((item) => ({
    ...item,
    subtopics: Array.isArray(item.subtopics)
      ? item.subtopics
      : typeof item.subtopics === "string"
        ? JSON.parse(item.subtopics)
        : [],
  }))
}

export async function createCurriculum(
  courseId: string,
  title: string,
  planItems: PlanItem[],
  classDay?: string | null,
  classStartTime?: string | null,
  classEndTime?: string | null,
  token?: string | null,
): Promise<CurriculumRecord> {
  const body: Record<string, unknown> = {
    course_id: courseId,
    title,
    plan_items: planItems,
  }
  if (classDay) body.class_day = classDay
  if (classStartTime) body.class_start_time = classStartTime
  if (classEndTime) body.class_end_time = classEndTime

  const response = await fetch(`${API_BASE_URL}/curriculum`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  return parseResponse<CurriculumRecord>(response)
}

export async function updateTopicStatus(
  curriculumId: number,
  topicId: number,
  status: string,
  token?: string | null,
): Promise<CurriculumRecord> {
  const response = await fetch(
    `${API_BASE_URL}/curriculum/${curriculumId}/topics/${topicId}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    },
  )
  return parseResponse<CurriculumRecord>(response)
}

export async function deleteCurriculum(
  curriculumId: number,
  token?: string | null,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/curriculum/${curriculumId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  })
  if (!response.ok) {
    await parseResponse(response)
  }
}
