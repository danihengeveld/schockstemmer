
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
import { Dices, AlertTriangle } from "lucide-react"

interface PendingViewProps {
  roundId: Id<"rounds">
  players: Doc<"players">[]
  isHost: boolean
}

export function PendingView({ roundId, players, isHost }: PendingViewProps) {
  const finishRound = useMutation(api.games.finishRound)
  const [selectedLoser, setSelectedLoser] = useState<Id<"players"> | null>(null)

  const handleFinishRound = async () => {
    if (selectedLoser) {
      await finishRound({
        roundId,
        loserId: selectedLoser
      })
    }
  }

  // Note: Select onChange returns string, so we need to cast or find.
  const handleValueChange = (val: string | null) => {
    setSelectedLoser(val as Id<"players">)
  }

  const headerContent = (
    <>
      <div className="flex justify-center mb-6">
        <div className="p-4 rounded-full bg-primary/10 text-primary shadow-sm animate-bounce">
          <Dices className="w-10 h-10" />
        </div>
      </div>
    </>
  )

  const title = "Game In Progress"

  return (
    <GameCard headerContent={headerContent} title={title}>
      <div className="text-center -mt-4 pb-4">
        <p className="text-muted-foreground font-medium">The dice are rolling...</p>
      </div>

      <div className="p-4 rounded-xl bg-secondary/50 border border-secondary text-sm text-muted-foreground leading-relaxed">
        <p><strong>Schocken is underway.</strong></p>
        <p>Wait for the game to complete. The host will select the loser below.</p>
      </div>

      {isHost ? (
        <div className="space-y-4 pt-4">
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
                {players.map((player) => (
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
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-500">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <p className="font-semibold">Waiting for Host...</p>
          <p className="text-xs opacity-80">
            Hope you didn't vote for the loser!
          </p>
        </div>
      )}
    </GameCard>
  )
}
