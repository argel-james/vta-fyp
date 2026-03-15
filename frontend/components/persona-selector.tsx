"use client"
import type { PersonaMode } from "@/types"

interface PersonaSelectorProps {
  currentPersona: PersonaMode
  onChange: (persona: PersonaMode) => void
}

const personas: Array<{ mode: PersonaMode; icon: string; label: string; tip: string }> = [
  { mode: "standard", icon: "🎓", label: "Standard", tip: "Clear step-by-step explanations" },
  { mode: "advocate", icon: "🎭", label: "Advocate", tip: "Challenges your assumptions" },
  { mode: "joker", icon: "😄", label: "Joker", tip: "Fun analogies & humour" },
  { mode: "socratic", icon: "🤔", label: "Socratic", tip: "Guides you with questions" },
]

export function PersonaSelector({ currentPersona, onChange }: PersonaSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {personas.map((p) => (
        <button
          key={p.mode}
          onClick={() => onChange(p.mode)}
          title={p.tip}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${
            currentPersona === p.mode
              ? "bg-primary text-primary-foreground shadow-lg scale-105"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          <span>{p.icon}</span>
          {p.label}
        </button>
      ))}
    </div>
  )
}
