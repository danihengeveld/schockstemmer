"use client"

import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Id, Doc } from "../../../convex/_generated/dataModel"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

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
      <p className="text-muted-foreground">Who do you think will <span className="font-semibold text-foreground">NOT</span> lose?</p>
    </div>
  )

  return (
    <GameCard headerContent={headerContent}>
      <div className="grid gap-2">
        {players.filter(p => !p.hasLeft).map((player) => {
          const isSelected = selectedId === player._id
          const isYou = player._id === currentPlayerId
          return (
            <Card
              key={player._id}
              className={`cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl bg-background/50 backdrop-blur-sm ${isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border"
                }`}
              onClick={() => setSelectedId(player._id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className={`h-10 w-10 border-2 shadow-sm ${isSelected ? "border-primary" : "border-background"}`}>
                  <AvatarFallback className={`font-bold text-sm ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {player.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-base font-medium flex-1">{player.name}</span>
                {isYou && <Badge variant="secondary" className="rounded-full text-[10px]">You</Badge>}
                {isSelected && (
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="w-5 h-5 text-primary shrink-0" />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedId === currentPlayerId && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
          ⚠️ Voting for yourself is risky — if you lose, you take 2 shots!
        </p>
      )}

      <Button
        className="w-full h-12 text-lg font-bold rounded-full shadow-md hover:shadow-lg transition-all"
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
