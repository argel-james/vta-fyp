"use client"

import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"

export default function ScenarioPage() {
  const params = useParams()
  const scenarioId = params?.id as string

  return (
    <div className="flex-1 w-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-4xl px-8 py-8">
          <Card className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-4">Scenario {scenarioId}</h1>
            <p className="text-muted-foreground">
              This is a featured conversation or scenario view. Content for scenario {scenarioId} would be displayed here.
            </p>
          </Card>
        </main>
      </div>
    </div>
  )
}
