import type { PersonaMode } from "@/types"

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
