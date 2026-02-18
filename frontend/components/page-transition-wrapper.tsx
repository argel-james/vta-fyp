"use client"

import React from "react"

/**
 * Page transition wrapper for smooth route changes.
 * This component applies CSS transitions when the page content changes.
 */
export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-hidden transition-opacity duration-300 ease-in-out">
      {children}
    </div>
  )
}
