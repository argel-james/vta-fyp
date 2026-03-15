"use client"

import { useState, useRef, useEffect, forwardRef, useCallback } from "react"
import type { Message, PersonaMode } from "@/types"
import { askQuestion } from "@/lib/chat-service"
import { useAuth } from "@/context/auth-context"
import { MessageBubble } from "./message-bubble"
import { PersonaSelector } from "./persona-selector"
import { ChatInput } from "./chat-input"
import { VoiceChat } from "./voice-chat"

interface ChatInterfaceProps {
  initialPrompt?: string | null
  courseId?: string
  learningLevel?: "beginner" | "intermediate" | "advanced"
}

const SUGGESTED_STARTERS = [
  "Summarise the key concepts from this week's lecture",
  "Explain the main differences between the two approaches discussed in class",
  "I'm confused about the assignment — can you walk me through the requirements?",
  "Quiz me on the core topics to test my understanding",
]

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  content:
    "Hey there! I'm your virtual classroom assistant. I can help you understand course material, " +
    "challenge your thinking, or guide you step-by-step — just pick a learning mode below.\n\n" +
    "Try one of the suggestions, or ask anything about your course!",
  role: "assistant",
  persona: "standard",
  timestamp: new Date(),
  isStreaming: false,
}

export const ChatInterface = forwardRef<HTMLDivElement, ChatInterfaceProps>(
  ({ initialPrompt, courseId, learningLevel: externalLevel }, ref) => {
    const { token } = useAuth()
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
    const [persona, setPersona] = useState<PersonaMode>("standard")
    const [learningLevel, setLearningLevel] = useState<"beginner" | "intermediate" | "advanced">(
      externalLevel || "intermediate",
    )
    const [isLoading, setIsLoading] = useState(false)
    const [showStarters, setShowStarters] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const initialPromptProcessed = useRef(false)

    const scrollToBottom = useCallback(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [])

    useEffect(() => {
      scrollToBottom()
    }, [messages, scrollToBottom])

    useEffect(() => {
      if (initialPrompt && !initialPromptProcessed.current) {
        initialPromptProcessed.current = true
        setTimeout(() => {
          handleSendMessage(initialPrompt)
        }, 500)
      }
    }, [initialPrompt])

    const buildHistory = (): { role: "user" | "assistant"; content: string }[] => {
      return messages
        .filter((m) => m.id !== "welcome" && !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }))
    }

    const handleSendMessage = async (content: string) => {
      if (!content.trim()) return

      setShowStarters(false)

      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        role: "user",
        persona: "user",
        timestamp: new Date(),
        isStreaming: false,
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const assistantMessageId = (Date.now() + 1).toString()

      const assistantMessage: Message = {
        id: assistantMessageId,
        content: "",
        role: "assistant",
        persona,
        timestamp: new Date(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, assistantMessage])

      const targetCourseId = courseId?.trim() || "sc2107"

      try {
        const history = buildHistory()

        const reply = await askQuestion({
          question: content,
          courseId: targetCourseId,
          token,
          persona,
          learningLevel,
          history,
        })

        await streamResponse(reply.answer, assistantMessageId)

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false, sources: reply.sources }
              : msg,
          ),
        )
      } catch (error) {
        const fallback =
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false, content: fallback }
              : msg,
          ),
        )
      } finally {
        setIsLoading(false)
      }
    }

    const streamResponse = async (fullContent: string, messageId: string) => {
      let currentContent = ""
      const chunks = fullContent.split(" ")

      for (let i = 0; i < chunks.length; i++) {
        currentContent += (i > 0 ? " " : "") + chunks[i]

        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, content: currentContent } : msg)),
        )

        const baseDelay = chunks[i].includes(".")
          ? 40
          : chunks[i].includes("?")
            ? 35
            : Math.random() * 20 + 10

        await new Promise((resolve) => setTimeout(resolve, baseDelay))
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, isStreaming: false } : msg)),
      )
    }

    return (
      <div
        ref={ref}
        className="w-full flex-1 min-h-0 flex flex-col bg-gradient-to-br from-background via-background to-secondary/5"
      >
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4 w-full">
          <div className="max-w-3xl mx-auto w-full space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Suggested starters */}
            {showStarters && messages.length <= 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {SUGGESTED_STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => handleSendMessage(starter)}
                    className="text-left text-sm px-4 py-3 rounded-lg border border-border bg-card hover:bg-primary/10 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="thinking-pulse px-4 py-3 rounded-lg rounded-tl-none max-w-xs">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Persona + Level selectors */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
          <div className="max-w-3xl mx-auto w-full flex flex-col sm:flex-row sm:items-center gap-3">
            <PersonaSelector currentPersona={persona} onChange={setPersona} />
            <div className="flex items-center gap-2 sm:ml-auto shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">Level:</span>
              {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLearningLevel(lvl)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                    learningLevel === lvl
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto w-full px-4 py-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={isLoading} />
              </div>
              <VoiceChat
                onTranscription={(text) => { if (text) void handleSendMessage(text) }}
                textToRead={messages.length > 1 ? messages[messages.length - 1]?.content : undefined}
                token={token}
                compact
              />
            </div>
          </div>
        </div>
      </div>
    )
  },
)

ChatInterface.displayName = "ChatInterface"
