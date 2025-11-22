"use client"
import type { PersonaMode } from "@/types"

interface PersonaSelectorProps {
  currentPersona: PersonaMode
  onChange: (persona: PersonaMode) => void
}

const personas: Array<{ mode: PersonaMode; icon: string; label: string }> = [
  { mode: "standard", icon: "🎓", label: "Standard" },
  { mode: "advocate", icon: "🎭", label: "Advocate" },
  { mode: "joker", icon: "😄", label: "Joker" },
  { mode: "socratic", icon: "🤔", label: "Socratic" },
]

export function PersonaSelector({ currentPersona, onChange }: PersonaSelectorProps) {
  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
      <div className="max-w-2xl mx-auto w-full">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Learning Mode</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {personas.map((p) => (
            <button
              key={p.mode}
              onClick={() => onChange(p.mode)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 font-medium transition-all duration-200 ${
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
      </div>
    </div>
  )
}
