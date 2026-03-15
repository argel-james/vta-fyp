"use client"

import { useVisualTheme } from "@/context/visual-theme-context"
import type { VisualTheme } from "@/types"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  learningLevel: "beginner" | "intermediate" | "advanced"
  onLearningLevelChange: (level: "beginner" | "intermediate" | "advanced") => void
  responseSpeed: number
  onResponseSpeedChange: (speed: number) => void
}

const visualThemes: { value: VisualTheme; label: string; description: string; preview: string }[] = [
  { value: "professional", label: "Professional", description: "Clean, modern look for universities", preview: "bg-indigo-500" },
  { value: "playful", label: "Playful", description: "Colorful, rounded — great for young learners", preview: "bg-pink-500" },
  { value: "classic", label: "Classic", description: "Muted, serif — traditional academic feel", preview: "bg-amber-700" },
]

export function SettingsModal({
  isOpen,
  onClose,
  learningLevel,
  onLearningLevelChange,
  responseSpeed,
  onResponseSpeedChange,
}: SettingsModalProps) {
  const { visualTheme, setVisualTheme } = useVisualTheme()

  if (!isOpen) return null

  const learningLevels = [
    { value: "beginner", label: "Beginner", description: "Simple explanations with basics" },
    { value: "intermediate", label: "Intermediate", description: "Balanced depth and clarity" },
    { value: "advanced", label: "Advanced", description: "In-depth concepts and details" },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Visual Theme */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-4">Visual Theme</label>
              <div className="space-y-2">
                {visualThemes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setVisualTheme(t.value)}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                      visualTheme === t.value ? "border-primary bg-primary/10" : "border-border hover:border-border/60"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${t.preview} flex-shrink-0`} />
                    <div>
                      <div className="font-medium text-foreground">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Level */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-4">Learning Level</label>
              <div className="space-y-2">
                {learningLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => onLearningLevelChange(level.value as "beginner" | "intermediate" | "advanced")}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      learningLevel === level.value ? "border-primary bg-primary/10" : "border-border hover:border-border/60"
                    }`}
                  >
                    <div className="font-medium text-foreground">{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Response Speed */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-4">Response Speed</label>
              <div className="space-y-3">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={responseSpeed}
                  onChange={(e) => onResponseSpeedChange(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slower</span>
                  <span className="font-medium text-foreground">{responseSpeed}%</span>
                  <span>Faster</span>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="p-4 bg-accent/10 rounded-lg border border-border">
              <h3 className="font-medium text-foreground mb-2">About GenAI Virtual Classroom</h3>
              <p className="text-xs text-muted-foreground">
                A GenAI-powered virtual classroom with gamified learning, persona-driven discussions, flashcards,
                and analytics. Designed for learners of all ages — from kindergarten to university.
              </p>
            </div>
          </div>

          <div className="border-t border-border px-6 py-4 bg-secondary/30">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
