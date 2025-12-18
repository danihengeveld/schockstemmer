"use client"

import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Id, Doc } from "../../../convex/_generated/dataModel"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface VotingViewProps {
  roundId: Id<"rounds">
  voterId: Id<"players">
  players: Doc<"players">[]
  currentPlayerId: Id<"players">
  currentVote: Id<"players"> | undefined
}

export function VotingView({ roundId, voterId, players, currentPlayerId, currentVote }: VotingViewProps) {
  const submitVote = useMutation(api.games.submitVote)
  const [selectedId, setSelectedId] = useState<Id<"players"> | undefined>(currentVote)

  const handleVote = async () => {
    if (selectedId) {
      await submitVote({
        roundId,
        voterId,
        votedForId: selectedId
      })
    }
  }

  const headerContent = (
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-bold tracking-tight">Place Your Bet</h1>
      <p className="text-muted-foreground">Who do you think will NOT lose?</p>
    </div>
  )

  return (
    <GameCard headerContent={headerContent}>
      <div className="grid gap-3">
        {players.filter(p => !p.hasLeft).map((player) => (
          <Card
            key={player._id}
            className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl bg-background/50 backdrop-blur-sm ${selectedId === player._id ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border"
              }`}
            onClick={() => setSelectedId(player._id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-lg font-medium">{player.name}</span>
              {player._id === currentPlayerId && <Badge variant="secondary" className="rounded-full">YOU</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="w-full text-lg py-6 rounded-full shadow-md hover:shadow-lg transition-all"
        size="lg"
        onClick={handleVote}
        disabled={!selectedId || selectedId === currentVote}
      >
        {currentVote ? "Change Vote" : "Confirm Vote"}
      </Button>

      {currentVote && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Waiting for other players...
        </p>
      )}
    </GameCard>
  )
}
