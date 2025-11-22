"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [learningLevel, setLearningLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate")
  const [responseSpeed, setResponseSpeed] = useState(50)
  const documentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const htmlElement = document.documentElement
    if (theme === "dark") {
      htmlElement.classList.add("dark")
    } else {
      htmlElement.classList.remove("dark")
    }
    router.push("/login")
  }, [theme, router])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return null
}
