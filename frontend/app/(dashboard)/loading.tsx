export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Navbar Loading */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
              <div className="h-8 w-20 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Loading */}
        <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />
          ))}
        </aside>

        {/* Page Content Loading */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="h-10 w-48 bg-muted rounded animate-pulse" />
              <div className="h-20 bg-muted rounded-lg animate-pulse" />
              <div className="h-32 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
