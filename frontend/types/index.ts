export type PersonaMode = "standard" | "advocate" | "joker" | "socratic"

export type VisualTheme = "professional" | "playful" | "classic"

export interface SourceInfo {
  file: string
  page?: number | null
}

export interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  persona: PersonaMode | "user"
  timestamp: Date
  isStreaming?: boolean
  sources?: SourceInfo[]
}

export interface Flashcard {
  front: string
  back: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}
