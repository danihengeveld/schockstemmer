"use client"

import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Id } from "../../../convex/_generated/dataModel"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface VotingViewProps {
  players: any[]
  currentPlayer: any
  onVote: (votedForId: Id<"players">) => void
  currentVote: Id<"players"> | undefined
}

export function VotingView({ players, currentPlayer, onVote, currentVote }: VotingViewProps) {
  const [selectedId, setSelectedId] = useState<Id<"players"> | undefined>(currentVote)

  const handleVote = () => {
    if (selectedId) {
      onVote(selectedId)
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
        {players.map((player) => (
          <Card
            key={player._id}
            className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${selectedId === player._id ? "border-primary bg-primary/5 ring-2 ring-primary" : ""
              }`}
            onClick={() => setSelectedId(player._id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-lg font-medium">{player.name}</span>
              {player._id === currentPlayer?._id && <Badge variant="secondary">YOU</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="w-full text-lg py-6"
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
