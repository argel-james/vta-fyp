"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/auth-context"
import type { Role } from "@/context/auth-context"

interface AuthGuardProps {
  children: ReactNode
  roles?: Role[]
  redirectTo?: string
}

export function AuthGuard({ children, roles, redirectTo = "/login" }: AuthGuardProps) {
  const { status, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(redirectTo)
    } else if (status === "authenticated" && roles && user && !roles.includes(user.role)) {
      router.replace(redirectTo)
    }
  }, [status, roles, user, router, redirectTo])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <span>Checking your session...</span>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <span>You do not have access to this area.</span>
      </div>
    )
  }

  return <>{children}</>
}
