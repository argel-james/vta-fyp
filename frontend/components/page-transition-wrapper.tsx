"use client"

import React from "react"

/**
 * Page transition wrapper for smooth route changes.
 * This component applies CSS transitions when the page content changes.
 */
export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col transition-opacity duration-300 ease-in-out">
      {children}
    </div>
  )
}
