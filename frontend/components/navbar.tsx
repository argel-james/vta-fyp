"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

interface NavbarProps {
  theme: "light" | "dark"
  onToggleTheme: () => void
  onToggleSidebar?: () => void
  userRole?: "student" | "professor"
}

export function Navbar({ theme, onToggleTheme, onToggleSidebar, userRole = "student" }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const resolvedRole = user?.role ?? userRole

  const navLinks = [
    { href: "/student", label: "Home", show: true },
    { href: "/chat", label: "Chat", show: true },
    { href: "/personas", label: "Personas", show: true },
    { href: "/learn", label: "Learn", show: true },
    { href: "/professor", label: "Professor", show: resolvedRole === "professor" },
    { href: "/analytics", label: "Analytics", show: resolvedRole === "professor" },
  ]

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + Sidebar Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/student" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">G</span>
              </div>
              <span className="font-semibold text-lg text-foreground hidden sm:inline">GVC</span>
              <span className="font-semibold text-lg text-foreground sm:hidden">GVC</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks
              .filter((link) => link.show)
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="outline" size="sm" onClick={() => void handleLogout()} className="hidden md:inline-flex">
              Logout
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-border space-y-2">
            {navLinks
              .filter((link) => link.show)
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            <button
              onClick={() => {
                void handleLogout()
                setMobileMenuOpen(false)
              }}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors text-destructive hover:bg-destructive/10"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
