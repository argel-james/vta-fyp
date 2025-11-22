export type PersonaMode = "standard" | "advocate" | "joker" | "socratic"

export interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  persona: PersonaMode | "user"
  timestamp: Date
  isStreaming?: boolean
}
