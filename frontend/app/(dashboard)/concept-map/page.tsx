"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useVisualTheme } from "@/context/visual-theme-context"
import { generateConceptMap, fetchCourses, type ConceptMapData } from "@/lib/chat-service"

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  core: { bg: "#6366f1", border: "#818cf8", text: "#fff" },
  supporting: { bg: "#8b5cf6", border: "#a78bfa", text: "#fff" },
  detail: { bg: "#a855f7", border: "#c084fc", text: "#fff" },
}

export default function ConceptMapPage() {
  const { token } = useAuth()
  const { visualTheme } = useVisualTheme()
  const isPlayful = visualTheme === "playful"

  const searchParams = useSearchParams()

  const [courseId, setCourseId] = useState("sc2107")
  const [courses, setCourses] = useState<string[]>([])
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [mapData, setMapData] = useState<ConceptMapData | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const course = searchParams.get("course")
    const t = searchParams.get("topic")
    if (course) setCourseId(course)
    if (t) setTopic(t)
  }, [searchParams])

  useEffect(() => {
    fetchCourses(token).then(setCourses).catch(() => {})
  }, [token])

  useEffect(() => {
    if (mapData?.nodes) {
      const positions: Record<string, { x: number; y: number }> = {}
      mapData.nodes.forEach((n) => { positions[n.id] = { x: n.x, y: n.y } })
      setNodePositions(positions)
    }
  }, [mapData])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setMapData(null)
    try {
      const data = await generateConceptMap(courseId, topic || undefined, token)
      setMapData(data)
    } catch {
      setMapData(null)
    } finally {
      setLoading(false)
    }
  }, [courseId, topic, token])

  const handleMouseDown = (nodeId: string) => {
    setDragging(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 800
    const y = ((e.clientY - rect.top) / rect.height) * 600
    setNodePositions((prev) => ({ ...prev, [dragging]: { x, y } }))
  }

  const handleMouseUp = () => { setDragging(null) }

  const getNodePos = (nodeId: string) => nodePositions[nodeId] || { x: 400, y: 300 }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-gradient-to-br from-background via-background to-violet-500/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-5xl px-6 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className={`text-3xl font-bold text-foreground ${isPlayful ? "tracking-wide" : ""}`}>
              {isPlayful ? "🗺️ Concept Explorer" : "Concept Map"}
            </h1>
            <p className="text-muted-foreground">
              Visualize how concepts relate to each other. Drag nodes to rearrange.
            </p>
          </div>

          {/* Controls */}
          <Card className="p-5">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-semibold text-foreground mb-1">Course</label>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                  {courses.length > 0 ? courses.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  )) : <option value={courseId}>{courseId.toUpperCase()}</option>}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-semibold text-foreground mb-1">Topic (optional)</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Data Structures, Cell Biology..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
              </div>
              <Button onClick={() => void handleGenerate()} disabled={loading} className="h-10">
                {loading ? "Generating..." : "Generate Map"}
              </Button>
            </div>
          </Card>

          {loading && (
            <div className="flex justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground">Analyzing concepts and relationships...</p>
              </div>
            </div>
          )}

          {/* Map */}
          {mapData && mapData.nodes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{mapData.title}</h2>
              <Card className="p-2 overflow-hidden">
                <svg
                  ref={svgRef}
                  viewBox="0 0 800 600"
                  className="w-full h-auto min-h-[400px] cursor-grab"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                  </defs>

                  {/* Edges */}
                  {mapData.edges.map((edge, i) => {
                    const from = getNodePos(edge.from)
                    const to = getNodePos(edge.to)
                    const mx = (from.x + to.x) / 2
                    const my = (from.y + to.y) / 2
                    return (
                      <g key={`edge-${i}`}>
                        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                          stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,5"
                          markerEnd="url(#arrowhead)" opacity={0.6} />
                        <rect x={mx - edge.label.length * 3.5} y={my - 8} width={edge.label.length * 7}
                          height={16} rx={4} fill="var(--background)" fillOpacity={0.9} />
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize="10"
                          fill="var(--muted-foreground)" className="select-none">
                          {edge.label}
                        </text>
                      </g>
                    )
                  })}

                  {/* Nodes */}
                  {mapData.nodes.map((node) => {
                    const pos = getNodePos(node.id)
                    const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.detail
                    const isHovered = hoveredNode === node.id
                    return (
                      <g key={node.id}
                        onMouseDown={() => handleMouseDown(node.id)}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="cursor-pointer">
                        <rect x={pos.x - 60} y={pos.y - 20} width={120} height={40}
                          rx={isPlayful ? 20 : 8}
                          fill={colors.bg} stroke={colors.border} strokeWidth={isHovered ? 3 : 1.5}
                          filter={isHovered ? "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" : ""}
                          style={{ transition: "filter 0.2s" }} />
                        <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill={colors.text}
                          fontSize="11" fontWeight="600" className="select-none pointer-events-none">
                          {node.label.length > 16 ? node.label.slice(0, 14) + "…" : node.label}
                        </text>
                        {isHovered && (
                          <g>
                            <rect x={pos.x - 100} y={pos.y + 25} width={200} height={40}
                              rx={6} fill="var(--background)" stroke="var(--border)" />
                            <text x={pos.x} y={pos.y + 42} textAnchor="middle"
                              fill="var(--foreground)" fontSize="10" className="select-none pointer-events-none">
                              {node.description.length > 55
                                ? node.description.slice(0, 52) + "…"
                                : node.description}
                            </text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </Card>

              {/* Legend */}
              <div className="flex gap-4 justify-center text-xs text-muted-foreground">
                {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.bg }} />
                    <span className="capitalize">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
