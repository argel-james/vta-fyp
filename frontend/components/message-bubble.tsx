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
  standard: "Standard Mode",
  advocate: "Devil's Advocate",
  joker: "Joker Mode",
  socratic: "Socratic Method",
  user: "You",
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const icon = personaIcons[message.persona] || "💬"
  const label = personaLabels[message.persona] || "Assistant"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} message-animate`}>
      <div className={`flex gap-3 max-w-xs ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0 ${
            isUser ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
          }`}
        >
          {icon}
        </div>

        {/* Message Bubble */}
        <div className="flex flex-col gap-1">
          {!isUser && <span className="text-xs font-medium text-muted-foreground px-1">{label}</span>}
          <div
            className={`px-4 py-3 rounded-lg ${
              isUser
                ? "bg-primary text-primary-foreground rounded-br-none"
                : "bg-card border border-border text-foreground rounded-bl-none"
            } ${message.isStreaming ? "animate-pulse" : ""}`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
              {message.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-accent/60 rounded animate-pulse" />}
            </p>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold">Sources</div>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <span key={`${source.file}-${source.page ?? idx}`} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1">
                      <span>{source.file}</span>
                      {typeof source.page === "number" && <span className="text-[11px] text-foreground/70">p{source.page}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground px-1">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
