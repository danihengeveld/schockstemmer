"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-center text-sm">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button onClick={reset} className="rounded-full px-8">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
