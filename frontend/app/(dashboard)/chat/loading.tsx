export default function ChatLoading() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="h-6 w-6 bg-muted rounded animate-pulse" />
      </div>

      {/* Loading Chat Interface */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="max-w-2xl mx-auto w-full space-y-4">
          {/* Welcome Message Skeleton */}
          <div className="flex justify-start">
            <div className="h-12 w-40 bg-muted rounded-lg animate-pulse" />
          </div>

          {/* Loading Indicator */}
          <div className="flex justify-start">
            <div className="thinking-pulse px-4 py-3 rounded-lg rounded-tl-none max-w-xs">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto w-full px-4 py-4">
          <div className="h-12 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
