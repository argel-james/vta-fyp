export default function PersonasLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="min-h-full bg-gradient-to-br from-background via-background to-secondary/5">
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>

          {/* Persona Selector Skeleton */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Description Card Skeleton */}
          <div className="h-24 bg-muted rounded-lg animate-pulse" />

          {/* Input Card Skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </main>
      </div>
    </div>
  )
}
