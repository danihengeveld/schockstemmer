"use client"

import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Id, Doc } from "../../../convex/_generated/dataModel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AlertCircleIcon, DiceIcon } from "@hugeicons/core-free-icons"

interface PendingViewProps {
  roundId: Id<"rounds">
  players: Doc<"players">[]
  isHost: boolean
  currentPlayerId: Id<"players">
}

export function PendingView({ roundId, players, isHost, currentPlayerId: currentUserId }: PendingViewProps) {
  const finishRound = useMutation(api.games.finishRound)
  const [selectedLoser, setSelectedLoser] = useState<Id<"players"> | null>(null)

  const handleFinishRound = async () => {
    if (!currentUserId) return
    if (selectedLoser) {
      await finishRound({
        roundId,
        loserId: selectedLoser,
        playerId: currentUserId
      })
    }
  }

  const handleValueChange = (val: string | null) => {
    setSelectedLoser(val as Id<"players">)
  }

  const headerContent = (
    <div className="flex justify-center pt-4 pb-2">
      <div className="p-4 rounded-full bg-primary/10 text-primary shadow-sm animate-wiggle">
        <HugeiconsIcon icon={DiceIcon} strokeWidth={2} className="w-10 h-10" />
      </div>
    </div>
  )

  return (
    <GameCard headerContent={headerContent} title="Game In Progress">
      <p className="text-center text-muted-foreground text-sm -mt-2">
        The dice are rolling... Wait for the game to finish.
      </p>

      {isHost ? (
        <div className="space-y-4 pt-2">
          <div className="text-left space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Who Lost?
            </label>
            <Select onValueChange={handleValueChange}>
              <SelectTrigger className="w-full h-12 text-lg">
                <SelectValue>
                  {selectedLoser ? players.find(p => p._id === selectedLoser)?.name : "Select the loser..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {players.filter(p => !p.hasLeft).map((player) => (
                  <SelectItem key={player._id} value={player._id} className="text-base">
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full h-12 text-lg font-bold rounded-full shadow-md hover:shadow-lg transition-all"
            variant="destructive"
            disabled={!selectedLoser}
            onClick={handleFinishRound}
          >
            Confirm Loser
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-500">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="w-6 h-6 animate-pulse" />
          <p className="font-semibold">Waiting for Host...</p>
          <p className="text-xs opacity-80">
            Hope you didn&apos;t vote for the loser!
          </p>
        </div>
      )}
    </GameCard>
  )
}
