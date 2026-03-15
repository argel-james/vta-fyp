export default function LearnLoading() {
  return (
    <div className="flex-1 w-full overflow-y-auto">
      <div className="flex justify-center min-h-full">
        <main className="w-full max-w-4xl px-6 py-8 space-y-8">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
          <div className="grid sm:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
