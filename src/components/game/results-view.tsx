"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useMutation } from "convex/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Logout01Icon,
  ShutDownIcon,
  SkullIcon
} from "@hugeicons/core-free-icons"
import { api } from "../../../convex/_generated/api"
import { Doc, Id } from "../../../convex/_generated/dataModel"
import { LoserCard } from "./results/loser-card"
import { DrinkingBuddiesCard } from "./results/drinking-buddies-card"
import { VotingBreakdown } from "./results/voting-breakdown"

interface ResultsViewProps {
  gameId: Id<"games">
  players: Doc<"players">[]
  votes: Doc<"votes">[]
  loserId: Id<"players">
  isHost: boolean
  onLeave: () => void
  currentPlayerId: Id<"players">
  gameStatus: "active" | "finished"
}

export function ResultsView({ gameId, players, votes, loserId, isHost, onLeave, currentPlayerId, gameStatus }: ResultsViewProps) {
  const startNextRound = useMutation(api.games.startNextRound)
  const finishGame = useMutation(api.games.finishGame)

  const handleNextRound = async () => {
    await startNextRound({ gameId, playerId: currentPlayerId })
  }

  const handleFinishGame = async () => {
    await finishGame({ gameId, playerId: currentPlayerId })
  }

  const loser = players.find(p => p._id === loserId)
  const loserVote = votes.find(v => v.voterId === loserId)
  const loserVotedForSelf = loserVote?.votedForId === loserId

  // Calculate shots for the loser
  const loserShots = loserVotedForSelf ? 2 : 1

  // Who voted for the loser? (Drinking Buddies)
  const drinkingBuddies = votes
    .filter(v => v.votedForId === loserId && v.voterId !== loserId)
    .map(v => players.find(p => p._id === v.voterId))
    .filter((p): p is Doc<"players"> => !!p)

  return (
    <div className="w-full max-w-2xl space-y-8 animate-in fade-in duration-700 py-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-destructive/10 text-destructive mb-4 animate-bounce">
          <HugeiconsIcon icon={SkullIcon} strokeWidth={2} className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tight underline decoration-destructive/30 underline-offset-8">
          {gameStatus === "finished" ? "GAME OVER" : "ROUND OVER"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {gameStatus === "finished" ? "The final results are in..." : "The results are in..."}
        </p>
      </div>

      <LoserCard
        loser={loser}
        loserShots={loserShots}
        loserVotedForSelf={loserVotedForSelf}
      />

      <DrinkingBuddiesCard
        drinkingBuddies={drinkingBuddies}
        loser={loser}
      />

      <VotingBreakdown
        players={players}
        votes={votes}
        loserId={loserId}
        loserVotedForSelf={loserVotedForSelf}
      />

      <div className="flex flex-col gap-3 w-full max-w-sm mx-auto pt-8 pb-12">
        {isHost && gameStatus !== "finished" && (
          <>
            <Button
              size="lg"
              onClick={handleNextRound}
              className="w-full h-12 rounded-full shadow-lg hover:shadow-xl transition-all font-bold uppercase tracking-widest"
            >
              Next Round
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full h-12 rounded-full shadow-md hover:shadow-lg transition-all font-bold uppercase tracking-widest"
                >
                  <HugeiconsIcon icon={ShutDownIcon} strokeWidth={2} className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End Game Session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to end this session? This will finish the game for all players and prevent any further rounds.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinishGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    End Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {gameStatus !== "finished" && (
          <Button
            size="lg"
            variant="outline"
            onClick={onLeave}
            className="w-full h-12 rounded-full shadow-sm hover:shadow-md transition-all font-bold uppercase tracking-widest"
          >
            <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="w-4 h-4 mr-2" />
            <span>Leave Game</span>
          </Button>
        )}
      </div>
    </div>
  )
}
