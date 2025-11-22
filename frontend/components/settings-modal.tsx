"use client"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  learningLevel: "beginner" | "intermediate" | "advanced"
  onLearningLevelChange: (level: "beginner" | "intermediate" | "advanced") => void
  responseSpeed: number
  onResponseSpeedChange: (speed: number) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  learningLevel,
  onLearningLevelChange,
  responseSpeed,
  onResponseSpeedChange,
}: SettingsModalProps) {
  if (!isOpen) return null

  const learningLevels = [
    { value: "beginner", label: "Beginner", description: "Simple explanations with basics" },
    { value: "intermediate", label: "Intermediate", description: "Balanced depth and clarity" },
    { value: "advanced", label: "Advanced", description: "In-depth concepts and details" },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Learning Level */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-4">Learning Level</label>
              <div className="space-y-2">
                {learningLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => onLearningLevelChange(level.value as "beginner" | "intermediate" | "advanced")}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      learningLevel === level.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-border/60"
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

            {/* Persona Info */}
            <div className="p-4 bg-secondary/30 rounded-lg border border-border">
              <h3 className="font-medium text-foreground mb-3">Persona Modes</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span>🎓</span>
                  <div>
                    <div className="font-medium text-foreground">Standard</div>
                    <div>Structured, step-by-step learning</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span>🎭</span>
                  <div>
                    <div className="font-medium text-foreground">Devil's Advocate</div>
                    <div>Challenges assumptions and perspective</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span>😄</span>
                  <div>
                    <div className="font-medium text-foreground">Joker</div>
                    <div>Humorous, engaging teaching style</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span>🤔</span>
                  <div>
                    <div className="font-medium text-foreground">Socratic</div>
                    <div>Questions to guide discovery</div>
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="p-4 bg-accent/10 rounded-lg border border-border">
              <h3 className="font-medium text-foreground mb-2">About Adaptive Tutor</h3>
              <p className="text-xs text-muted-foreground">
                This AI teaching assistant uses multiple learning modes to make education engaging and
                thought-provoking. Responses are carefully paced to encourage deep learning rather than passive
                consumption.
              </p>
            </div>
          </div>

          {/* Footer */}
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
