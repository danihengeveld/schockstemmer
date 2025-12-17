"use client"

import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Id } from "../../../convex/_generated/dataModel"
import { Doc } from "../../../convex/_generated/dataModel"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, Skull, Beer } from "lucide-react"

interface ResultsViewProps {
  players: Doc<"players">[]
  votes: Doc<"votes">[]
  loserId: Id<"players">
  onLeave: () => void
}

export function ResultsView({ players, votes, loserId, onLeave }: ResultsViewProps) {
  const loser = players.find(p => p._id === loserId)

  // Who voted for the loser? (Drinking Buddies)
  const drinkingBuddies = votes
    .filter(v => v.votedForId === loserId)
    .map(v => players.find(p => p._id === v.voterId))
    .filter((p): p is Doc<"players"> => !!p)

  // Calculate vote counts
  const voteCounts = new Map<string, number>()
  votes.forEach(v => {
    const count = voteCounts.get(v.votedForId) || 0
    voteCounts.set(v.votedForId, count + 1)
  })

  // Since Results view is more complex/wider, we override the max-w
  return (
    <div className="w-full max-w-2xl space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-destructive/10 text-destructive mb-4 animate-bounce">
          <Skull className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black">GAME OVER</h1>
        <p className="text-muted-foreground text-lg">The results are in...</p>
      </div>

      <Card className="border-2 border-destructive/20 shadow-2xl shadow-destructive/10 overflow-hidden relative bg-card">
        <div className="absolute inset-0 bg-destructive/5 pointer-events-none z-0" />
        <CardHeader className="text-center pb-2 relative z-10">
          <CardTitle className="text-xl uppercase tracking-widest text-destructive font-bold">The Loser</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8 relative z-10">
          <Avatar className="h-32 w-32 border-4 border-destructive shadow-xl ring-4 ring-destructive/20">
            <AvatarFallback className="bg-destructive text-destructive-foreground text-4xl font-black">
              {loser?.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center space-y-1">
            <h2 className="text-4xl font-black tracking-tight">{loser?.name}</h2>
            <p className="text-destructive font-bold animate-pulse">Has to drink!</p>
          </div>
        </CardContent>
      </Card>

      {drinkingBuddies.length > 0 && (
        <Card className="bg-secondary/30 border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Beer className="w-5 h-5 text-amber-500" />
              Drinking Buddies
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These people thought {loser?.name} was safe. They drink too!
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {drinkingBuddies.map(buddy => (
                <Badge key={buddy._id} variant="secondary" className="px-3 py-1 text-base">
                  {buddy.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 pt-8">
        <h3 className="text-center text-sm font-semibold uppercase text-muted-foreground tracking-widest">Full Voting Breakdown</h3>
        <div className="grid gap-3">
          {players.map(player => {
            const vote = votes.find(v => v.voterId === player._id)
            const votedFor = players.find(p => p._id === vote?.votedForId)

            return (
              <div key={player._id} className="flex justify-between items-center p-3 rounded-lg bg-card border shadow-sm text-sm">
                <span className="font-medium">{player.name}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>voted for</span>
                  <span className="font-bold text-foreground">{votedFor?.name || "Unknown"}</span>
                  {votedFor?._id === loserId ? (
                    <Badge variant="destructive" className="ml-2 text-[10px]">INCORRECT</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 text-[10px] bg-green-500/10 text-green-600 border-green-200">SAFE</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-center pt-8 pb-12">
        <Button size="lg" variant="outline" onClick={onLeave} className="min-w-[200px]">
          Back to Home
        </Button>
      </div>
    </div>
  )
}
