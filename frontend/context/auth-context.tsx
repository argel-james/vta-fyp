"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import type { AuthSessionPayload } from "@/lib/auth-service"
import * as authService from "@/lib/auth-service"

export type Role = "student" | "professor"
export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface AuthUser {
  email: string
  role: Role
}

interface AuthState {
  status: AuthStatus
  token: string | null
  sessionId: string | null
  expiry: string | null
  user: AuthUser | null
}

interface StoredSession {
  token: string
  sessionId: string
  expiry: string
  email: string
  role: Role
}

interface AuthContextValue extends AuthState {
  login: (session: AuthSessionPayload) => void
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const storageKey = "gvc.auth.session"
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const unauthenticatedBase = {
  token: null,
  sessionId: null,
  expiry: null,
  user: null,
} as const

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", ...unauthenticatedBase })
  const [hydrated, setHydrated] = useState(false)
  const [shouldValidateStoredSession, setShouldValidateStoredSession] = useState(false)
  const latestTokenRef = useRef<string | null>(null)

  const setUnauthenticated = useCallback(() => {
    setState({ status: "unauthenticated", ...unauthenticatedBase })
    latestTokenRef.current = null
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) {
      setUnauthenticated()
      setHydrated(true)
      return
    }

    try {
      const parsed = JSON.parse(stored) as StoredSession
      setState({
        status: "authenticated",
        token: parsed.token,
        sessionId: parsed.sessionId,
        expiry: parsed.expiry,
        user: { email: parsed.email, role: parsed.role },
      })
      latestTokenRef.current = parsed.token
      setShouldValidateStoredSession(true)
    } catch (_error) {
      window.localStorage.removeItem(storageKey)
      setUnauthenticated()
    } finally {
      setHydrated(true)
    }
  }, [setUnauthenticated])

  const persistSession = useCallback((session: StoredSession) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(session))
    }
    latestTokenRef.current = session.token
    setState({
      status: "authenticated",
      token: session.token,
      sessionId: session.sessionId,
      expiry: session.expiry,
      user: { email: session.email, role: session.role },
    })
  }, [])

  const logoutInternal = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = latestTokenRef.current
      if (!options?.silent && token) {
        try {
          await authService.logout(token)
        } catch (error) {
          console.warn("Failed to notify backend about logout", error)
        }
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey)
      }
      setUnauthenticated()
    },
    [setUnauthenticated],
  )

  const login = useCallback(
    (session: AuthSessionPayload) => {
      const stored: StoredSession = {
        token: session.token,
        sessionId: session.sessionId,
        expiry: session.expiry,
        email: session.email,
        role: session.role,
      }
      persistSession(stored)
    },
    [persistSession],
  )

  const logout = useCallback(async () => {
    await logoutInternal()
  }, [logoutInternal])

  const refreshSession = useCallback(async () => {
    const token = latestTokenRef.current
    if (!token) {
      return
    }
    try {
      const session = await authService.getSession(token)
      persistSession({
        token,
        sessionId: session.sessionId,
        expiry: session.expiry,
        email: session.email,
        role: session.role,
      })
    } catch (error) {
      console.warn("Session validation failed", error)
      await logoutInternal({ silent: true })
    }
  }, [logoutInternal, persistSession])

  useEffect(() => {
    if (!hydrated || !shouldValidateStoredSession || state.status !== "authenticated") {
      return
    }
    setShouldValidateStoredSession(false)
    void refreshSession()
  }, [hydrated, shouldValidateStoredSession, state.status, refreshSession])

  const value: AuthContextValue = useMemo(
    () => ({
      ...state,
      login,
      logout,
      refreshSession,
    }),
    [state, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
