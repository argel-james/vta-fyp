export default function StudentLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="min-h-full bg-gradient-to-br from-background via-background to-secondary/5">
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>

          {/* Main Cards Skeleton */}
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Featured Conversations Skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
