"use client"

import { useState, useRef, useEffect, forwardRef } from "react"
import type { Message, PersonaMode } from "@/types"
import { MessageBubble } from "./message-bubble"
import { PersonaSelector } from "./persona-selector"
import { ChatInput } from "./chat-input"

interface ChatInterfaceProps {
  learningLevel: "beginner" | "intermediate" | "advanced"
  responseSpeed: number
  initialPrompt?: string | null
}

export const ChatInterface = forwardRef<HTMLDivElement, ChatInterfaceProps>(
  ({ learningLevel, responseSpeed, initialPrompt }, ref) => {
    const [messages, setMessages] = useState<Message[]>([
      {
        id: "1",
        content:
          "Welcome to Adaptive Tutor! I'm here to help you learn through thoughtful questioning and guided discovery. Choose a learning mode to get started.",
        role: "assistant",
        persona: "standard",
        timestamp: new Date(),
        isStreaming: false,
      },
    ])
    const [persona, setPersona] = useState<PersonaMode>("standard")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const initialPromptProcessed = useRef(false)

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
      scrollToBottom()
    }, [messages])

    useEffect(() => {
      if (initialPrompt && !initialPromptProcessed.current) {
        initialPromptProcessed.current = true
        setTimeout(() => {
          handleSendMessage(initialPrompt)
        }, 500)
      }
    }, [initialPrompt])

    const streamResponse = async (fullContent: string, messageId: string, personaMode: PersonaMode) => {
      let currentContent = ""
      const chunks = fullContent.split(" ")
      const speedMultiplier = responseSpeed / 50

      for (let i = 0; i < chunks.length; i++) {
        currentContent += (i > 0 ? " " : "") + chunks[i]

        setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, content: currentContent } : msg)))

        const baseDelay = chunks[i].includes(".") ? 150 : chunks[i].includes("?") ? 140 : Math.random() * 50 + 30

        const delay = baseDelay / speedMultiplier

        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isStreaming: false } : msg)))
    }

    const getResponseForLevel = (persona: PersonaMode): string => {
      const levelResponses: Record<"beginner" | "intermediate" | "advanced", Record<PersonaMode, string>> = {
        beginner: {
          standard:
            "Great question! Let me explain this simply. Think of it like this: First, we start with the basic idea. Then we add one more piece. Finally, we put it all together. Does that make sense so far?",
          advocate:
            "Wait, but what if I told you the opposite? Before we continue, let me ask: What makes you think that's true?",
          joker:
            "Ha! Good question! Imagine if I told you the answer was the opposite... just kidding! Let me break it down in a fun way.",
          socratic:
            "Interesting question! Before I explain, tell me: What do you already know about this? What have you seen before that might be similar?",
        },
        intermediate: {
          standard:
            "That's an insightful question! Let me break this down into manageable steps. First, consider the foundational concepts at play. What happens when you apply this principle to similar situations? Think about the underlying mechanisms. How do these connect to what you've learned before?",
          advocate:
            "I'd like to challenge that perspective. Have you considered the opposite viewpoint? What if we flipped the assumption on its head? Many brilliant minds have assumed the same thing only to discover the nuance. What would disprove your current thinking?",
          joker:
            "Ha! Great question, but here's the twist - the answer might not be what you expect! Before I spoil it, let me ask you something: Why do you think most people get this wrong? There's actually a hilarious way to remember this concept.",
          socratic:
            "Excellent inquiry! Rather than giving you the answer directly, let me ask you: What connections do you see between this and what you learned previously? When you think about similar problems you've solved, what patterns emerge? What would happen if you tested your hypothesis?",
        },
        advanced: {
          standard:
            "Sophisticated inquiry! Let's delve into the theoretical framework. Consider the abstract principles governing this phenomenon. How does this relate to edge cases? What are the mathematical implications? Can you extrapolate this to higher-order scenarios? Think about the meta-level patterns and cross-domain applications.",
          advocate:
            "I must fundamentally challenge your premise. Have you rigorously examined the counterargument? The assumptions underpinning your reasoning deserve scrutiny. Consider the boundary conditions. What empirical evidence contradicts your hypothesis? How would you refute the opposing thesis?",
          joker:
            "Brilliant question! But the plot twist is deliciously counterintuitive. Before we dive into the philosophical rabbit hole, what's your educated guess on why conventional wisdom fails here? The elegance of this concept lies in its paradoxical nature!",
          socratic:
            "Excellent question that demands rigorous analysis! Let me guide you through the meta-cognitive process. What epistemological assumptions underlie your question? How do you reconcile this with related theoretical frameworks? What would constitute sufficient evidence? Can you construct a proof by contradiction?",
        },
      }

      return levelResponses[learningLevel][persona]
    }

    const handleSendMessage = async (content: string) => {
      if (!content.trim()) return

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

      const response = getResponseForLevel(persona)
      await streamResponse(response, assistantMessageId, persona)
      setIsLoading(false)
    }

    return (
      <div
        ref={ref}
        className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-secondary/5"
      >
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <div className="max-w-2xl mx-auto w-full space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="thinking-pulse px-4 py-3 rounded-lg rounded-tl-none max-w-xs">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Persona Selector */}
        <PersonaSelector currentPersona={persona} onChange={setPersona} />

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto w-full px-4 py-4">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={isLoading} />
          </div>
        </div>
      </div>
    )
  },
)

ChatInterface.displayName = "ChatInterface"
