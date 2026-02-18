export default function ProfessorLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex min-h-full bg-gradient-to-br from-background via-background to-secondary/5">
        {/* Sidebar Skeleton */}
        <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm sticky top-0 h-screen p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-8 space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>

          {/* Content Card Skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="h-40 bg-muted rounded-lg animate-pulse" />
          </div>
        </main>
      </div>
    </div>
  )
}
