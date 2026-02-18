"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps {
  isOpen: boolean
  onSettingsClick?: () => void
}

export function Sidebar({ isOpen, onSettingsClick }: SidebarProps) {
  const [activeChat, setActiveChat] = useState<string | null>("new")
  const pathname = usePathname()

  const recentChats = [
    { id: "1", title: "Calculus Problem Set", date: "Today" },
    { id: "2", title: "Linear Algebra Concepts", date: "Yesterday" },
    { id: "3", title: "Physics Chapter Review", date: "2 days ago" },
  ]

  return (
    <>
      <aside
        className={`${
          isOpen ? "w-64" : "w-0"
        } h-[calc(100vh-73px)] bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
      >
      {/* New Chat Button */}
      <div className="p-4 border-b border-border">
        <button className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Learning Modes */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Learning Modes</h3>
        <div className="space-y-2">
          {[
            { icon: "💬", label: "Standard Chat", href: "/chat" },
            { icon: "🎭", label: "Personas", href: "/personas" },
            { icon: "😄", label: "Discussions", href: "/personas?mode=joker" },
            { icon: "🤔", label: "Socratic", href: "/personas?mode=socratic" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block w-full px-3 py-2 text-left text-sm rounded-lg transition-colors flex items-center gap-2 ${
                pathname === item.href || (pathname?.includes('personas') && item.href === '/personas')
                  ? "bg-primary/20 text-primary font-medium"
                  : "hover:bg-secondary/50 text-foreground/80 hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Course Materials */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Course Materials</h3>
        <div className="space-y-2">
          {["Lecture Notes 01", "Lecture Notes 02", "Problem Sets", "Reference Materials"].map((item, idx) => (
            <button
              key={idx}
              className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-secondary/50 transition-colors text-foreground/70 hover:text-foreground"
            >
              📄 {item}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Chats */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Chats</h3>
        <div className="space-y-2">
          {recentChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                activeChat === chat.id
                  ? "bg-primary/20 text-primary font-medium"
                  : "hover:bg-secondary/50 text-foreground/70 hover:text-foreground"
              }`}
            >
              <div className="truncate font-medium">{chat.title}</div>
              <div className="text-xs text-muted-foreground">{chat.date}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onSettingsClick}
          className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-secondary/50 transition-colors text-foreground/70 hover:text-foreground flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
      </aside>
    </>
  )
}
