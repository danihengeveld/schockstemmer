"use default"
"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"

export default function HistoryPage() {
  const { user, isLoaded } = useUser()
  // Fetch games for the authenticated user (or by email if their email is linked)
  const games = useQuery(api.games.getUserGames, { email: user?.primaryEmailAddress?.emailAddress })

  if (!isLoaded || games === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Game History</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {games.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No games played yet. <Link href="/" className="text-primary underline">Create or Join one!</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {games.map((game) => (
              <Card key={game._id} className="transition-all hover:bg-accent/50">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                  <div>
                    <CardTitle>Game {game.code}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game._creationTime).toLocaleDateString()} at {new Date(game._creationTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={game.status === "finished" ? "secondary" : "default"}>
                      {game.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      {game.finishedAt ? "Finished" : "In Progress"}
                    </div>
                    <Link href={`/game/${game._id}`}>
                      <Button size="sm">View Game</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
