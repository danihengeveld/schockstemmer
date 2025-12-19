"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  UserGroupIcon,
  ChampionIcon,
  Calendar03Icon,
  ArrowUpRight01Icon,
  TransactionHistoryIcon
} from "@hugeicons/core-free-icons"

export default function HistoryPage() {
  const games = useQuery(api.games.getUserGames)

  if (!games) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-8 px-4 py-8">
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="h-8 w-8 text-primary" />
            Game History
          </h1>
          <p className="text-muted-foreground">Review your past games and see who had to pay.</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="rounded-full shadow-sm hover:shadow-md transition-shadow">
            Back to Home
          </Button>
        </Link>
      </div>

      {games.length === 0 ? (
        <Card className="w-full bg-card/50 backdrop-blur-sm border-dashed rounded-xl py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
              <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">No games played yet</CardTitle>
              <p className="text-muted-foreground max-w-sm">
                Your game history is looking a bit empty. Start a new game and let the fun begin!
              </p>
            </div>
            <Link href="/">
              <Button size="lg" className="rounded-full px-8">Start a Game</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid w-full gap-6">
          {games.map((game) => (
            <Card key={game._id} className="group overflow-hidden border-border transition-all hover:border-primary/50 hover:shadow-lg bg-card/50 backdrop-blur-sm rounded-xl">
              <div className="absolute top-0 left-0 w-1 bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold tracking-tight">
                      Game {game.code}
                    </CardTitle>
                    <Badge
                      variant={game.status === "finished" ? "secondary" : "default"}
                      className={`capitalize rounded-full ${game.status === "finished" ? "bg-secondary/50" : "animate-pulse"}`}
                    >
                      {game.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="h-3 w-3" />
                      {new Date(game._creationTime).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="h-3 w-3" />
                      {game.playerCount} {game.playerCount === 1 ? 'Player' : 'Players'}
                    </span>
                  </div>
                </div>
                <Link href={`/game/${game._id}`}>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                    <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pb-4">
                {game.status === "finished" ? (
                  <div className="p-3 rounded-xl bg-accent/30 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <HugeiconsIcon icon={ChampionIcon} strokeWidth={2} className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">The Loser</p>
                        <p className="text-sm font-bold truncate max-w-[150px] sm:max-w-xs">{game.loserName || "Unknown"}</p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</p>
                      <p className="text-sm font-medium">
                        {game.finishedAt
                          ? `${Math.round((game.finishedAt - game._creationTime) / 60000)} mins`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic px-2">
                    This game is currently in progress. Join back in to finish the showdown!
                  </p>
                )}
              </CardContent>
              <CardFooter className="pt-2 pb-3 border-t bg-accent/5 flex justify-between items-center px-6">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold font-mono">
                  {game.status === 'finished' ? 'Session Closed' : 'Active Session'}
                </span>
                <Link href={`/game/${game._id}`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition-all">
                  View Game Details <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="h-3 w-3" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
