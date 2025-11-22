"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProfessorDashboard() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [sidebarTab, setSidebarTab] = useState<"upload" | "status" | "personas">("upload")
  const [uploadedFiles, setUploadedFiles] = useState([
    { id: "1", name: "Lecture_01_Introduction.pdf", size: "2.4 MB", date: "2024-01-15", status: "Ready" },
    { id: "2", name: "Lecture_02_DataStructures.pdf", size: "3.1 MB", date: "2024-01-16", status: "Processing" },
    { id: "3", name: "Assignment_Week1.pdf", size: "1.2 MB", date: "2024-01-14", status: "Ready" },
    { id: "4", name: "ProblemSet_01.pdf", size: "890 KB", date: "2024-01-17", status: "Pending" },
  ])
  const [personas, setPersonas] = useState([
    { id: "standard", name: "Standard", description: "Clear, structured explanations", enabled: true },
    {
      id: "advocate",
      name: "Devil's Advocate",
      description: "Challenges assumptions and encourages critical thinking",
      enabled: true,
    },
    { id: "joker", name: "Joker", description: "Makes learning fun with humor", enabled: true },
    { id: "socratic", name: "Socratic", description: "Guides through thoughtful questions", enabled: false },
  ])

  useEffect(() => {
    const htmlElement = document.documentElement
    if (theme === "dark") {
      htmlElement.classList.add("dark")
    } else {
      htmlElement.classList.remove("dark")
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const handleFileUpload = () => {
    // Placeholder for file upload
    alert("File upload would be handled here. This will call /api/upload-materials endpoint.")
  }

  const togglePersona = (id: string) => {
    setPersonas(personas.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ready":
        return "text-green-600 dark:text-green-400 bg-green-500/10"
      case "Processing":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
      case "Pending":
        return "text-gray-600 dark:text-gray-400 bg-gray-500/10"
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-500/10"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <Navbar theme={theme} onToggleTheme={toggleTheme} userRole="professor" />

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card/50 backdrop-blur-sm">
          <div className="p-4 space-y-2">
            <button
              onClick={() => setSidebarTab("upload")}
              className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                sidebarTab === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-secondary/50"
              }`}
            >
              Upload Materials
            </button>
            <button
              onClick={() => setSidebarTab("status")}
              className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                sidebarTab === "status"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-secondary/50"
              }`}
            >
              Ingestion Status
            </button>
            <button
              onClick={() => setSidebarTab("personas")}
              className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                sidebarTab === "personas"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-secondary/50"
              }`}
            >
              Class Personas
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Professor Dashboard</h1>
            <p className="text-muted-foreground">Manage course materials and learning personas</p>
          </div>

          {/* Upload Materials Tab */}
          {sidebarTab === "upload" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Upload Course Materials</h2>
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-muted-foreground mb-4">Drag and drop PDF files here, or click to browse</p>
                <Button onClick={handleFileUpload}>Upload PDF</Button>
              </div>
            </Card>
          )}

          {/* Ingestion Status Tab */}
          {sidebarTab === "status" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Ingestion Status</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">File Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Upload Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedFiles.map((file) => (
                      <tr key={file.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-foreground">{file.name}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{file.size}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{file.date}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(file.status)}`}>
                            {file.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Class Personas Tab */}
          {sidebarTab === "personas" && (
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Class Personas</h2>
              <p className="text-sm text-muted-foreground">
                Enable or disable learning personas for your students to use in this course.
              </p>
              <div className="space-y-3">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{persona.name}</h3>
                      <p className="text-sm text-muted-foreground">{persona.description}</p>
                    </div>
                    <button
                      onClick={() => togglePersona(persona.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        persona.enabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          persona.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
