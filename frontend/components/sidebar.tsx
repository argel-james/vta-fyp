"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

interface SidebarProps {
  isOpen: boolean
  isMobile?: boolean
  onClose?: () => void
  onSettingsClick?: () => void
}

const learningModes = [
  { icon: "💬", label: "Standard Chat", href: "/chat" },
  { icon: "🎭", label: "Personas", href: "/personas" },
  { icon: "🎮", label: "Learn & Play", href: "/learn" },
  { icon: "📅", label: "Curriculum", href: "/curriculum" },
]

const interactiveItems = [
  { icon: "🧙‍♂️", label: "Socratic Tutor", href: "/socratic" },
  { icon: "🎓", label: "Teach-It-Back", href: "/teach-back" },
  { icon: "🗺️", label: "Concept Map", href: "/concept-map" },
  { icon: "🎮", label: "Scenarios", href: "/scenarios" },
  { icon: "🎨", label: "Picture Cards", href: "/illustrated" },
  { icon: "📓", label: "Mistake Journal", href: "/revision" },
]

export function Sidebar({ isOpen, isMobile = false, onClose, onSettingsClick }: SidebarProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (!isMobile || !isOpen) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [isMobile, isOpen])

  const handleLinkClick = () => {
    if (isMobile && onClose) onClose()
  }

  const isActive = (href: string) =>
    pathname === href || (pathname?.includes("personas") && href === "/personas")

  const linkClass = (href: string) =>
    `w-full px-3 py-2 text-left text-sm rounded-lg transition-colors flex items-center gap-2 ${
      isActive(href)
        ? "bg-primary/20 text-primary font-medium"
        : "hover:bg-secondary/50 text-foreground/80 hover:text-foreground"
    }`

  const sidebarContent = (
    <>
      {/* New Chat Button */}
      <div className="p-4 border-b border-border">
        <Link
          href="/chat"
          onClick={handleLinkClick}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </Link>
      </div>

      {/* Learning Modes */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Learning Modes</h3>
        <div className="space-y-1">
          {learningModes.map((item) => (
            <Link key={item.href} href={item.href} onClick={handleLinkClick} className={linkClass(item.href)}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Interactive Features */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Interactive</h3>
        <div className="space-y-1">
          {interactiveItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={handleLinkClick} className={linkClass(item.href)}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => {
            onSettingsClick?.()
            if (isMobile) onClose?.()
          }}
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
    </>
  )

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Mobile header with close button */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <span className="font-semibold text-foreground">Menu</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {sidebarContent}
        </aside>
      </>
    )
  }

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-0"
      } h-[calc(100vh-73px)] bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
    >
      {sidebarContent}
    </aside>
  )
}
