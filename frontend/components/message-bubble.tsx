"use client"
import type { Message } from "@/types"

interface MessageBubbleProps {
  message: Message
}

const personaIcons: Record<string, string> = {
  standard: "🎓",
  advocate: "🎭",
  joker: "😄",
  socratic: "🤔",
  user: "👤",
}

const personaLabels: Record<string, string> = {
  standard: "Tutor",
  advocate: "Devil's Advocate",
  joker: "The Joker",
  socratic: "Socratic Guide",
  user: "You",
}

function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    const formatted = line.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold">$1</strong>',
    )
    return (
      <span key={i}>
        {i > 0 && <br />}
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
      </span>
    )
  })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const icon = personaIcons[message.persona] || "💬"
  const label = personaLabels[message.persona] || "Assistant"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} message-animate`}>
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse max-w-[75%]" : "flex-row max-w-[85%]"}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 mt-1 ${
            isUser ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
          }`}
        >
          {icon}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          {!isUser && <span className="text-xs font-medium text-muted-foreground px-1">{label}</span>}
          <div
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border text-foreground rounded-bl-sm"
            } ${message.isStreaming ? "animate-pulse" : ""}`}
          >
            <div className="text-sm leading-relaxed break-words">
              {renderContent(message.content)}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-accent/60 rounded animate-pulse" />
              )}
            </div>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold">Sources</div>
                <div className="flex flex-wrap gap-1.5">
                  {message.sources.map((source, idx) => (
                    <span
                      key={`${source.file}-${source.page ?? idx}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5"
                    >
                      <span>{source.file}</span>
                      {typeof source.page === "number" && (
                        <span className="text-[11px] text-foreground/70">p{source.page}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground/60 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  )
}
