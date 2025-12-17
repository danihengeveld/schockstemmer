"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { LobbyView } from "@/components/game/lobby-view"
import { VotingView } from "@/components/game/voting-view"
import { PendingView } from "@/components/game/pending-view"
import { ResultsView } from "@/components/game/results-view"
import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { JoinGameDialog } from "@/components/game/join-game-dialog"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { GameCard } from "@/components/game/game-card"

export default function GamePage() {
  const params = useParams()
  const gameId = params.gameId as Id<"games">
  const { user, isLoaded } = useUser()
  const router = useRouter()

  // Fetch game data
  const data = useQuery(api.games.getGameWithDetails, { gameId })

  // Mutations
  const startGame = useMutation(api.games.startGame)
  const submitVote = useMutation(api.games.submitVote)
  const finishGame = useMutation(api.games.finishGame)
  const joinGame = useMutation(api.games.joinGame)

  // Local state
  const [showJoinDialog, setShowJoinDialog] = useState(false)

  // Derived state
  const game = data?.game
  const players = data?.players || []
  const votes = data?.votes || []

  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null)
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`schock_game_${gameId}`)
    if (stored) setLocalPlayerId(stored)
    setHasCheckedStorage(true)
  }, [gameId])

  const currentPlayer = players.find(p =>
    (user && p.clerkId === user.id) ||
    (localPlayerId && p._id === localPlayerId)
  )

  const isHost = currentPlayer?.isHost ?? false

  // Join Dialog Management
  useEffect(() => {
    // Only show dialog if we have loaded data, checked storage, and still found no player
    if (data && isLoaded && hasCheckedStorage && !currentPlayer) {
      setShowJoinDialog(true)
    } else {
      setShowJoinDialog(false)
    }
  }, [data, currentPlayer, isLoaded, hasCheckedStorage])

  if (!data) {
    return (
      <main className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <GameCard>
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6 mx-auto" />
            <div className="grid gap-2 pt-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </GameCard>
      </main>
    )
  }

  // Handlers
  const handleStartGame = async () => {
    await startGame({ gameId })
  }

  const handleVote = async (votedForId: Id<"players">) => {
    if (!currentPlayer) return
    await submitVote({
      gameId,
      voterId: currentPlayer._id,
      votedForId
    })
  }

  const handleFinishGame = async (loserId: Id<"players">) => {
    await finishGame({
      gameId,
      loserId
    })
  }

  const handleJoin = async (name: string, email?: string) => {
    const result = await joinGame({
      gameId,
      guestName: name,
      guestEmail: email,
    })

    if (result.success) {
      localStorage.setItem(`schock_game_${gameId}`, result.playerId)
      setLocalPlayerId(result.playerId)
    } else {
      toast.error(result.error)
    }
  }

  // View Routing
  if (showJoinDialog) {
    return <JoinGameDialog gameCode={game?.code} onJoin={handleJoin} />
  }

  return (
    <main className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      {game?.status === "lobby" && (
        <LobbyView
          gameCode={game.code}
          players={players}
          isHost={isHost}
          onStartGame={handleStartGame}
          currentUserId={currentPlayer?._id || null}
        />
      )}

      {game?.status === "voting" && (
        <VotingView
          players={players}
          currentPlayer={currentPlayer}
          onVote={handleVote}
          currentVote={votes.find(v => v.voterId === currentPlayer?._id)?.votedForId}
        />
      )}

      {game?.status === "pending" && (
        <PendingView
          players={players}
          isHost={isHost}
          onGameFinished={handleFinishGame}
        />
      )}

      {game?.status === "finished" && (
        <ResultsView
          players={players}
          votes={votes}
          loserId={game.loserId!}
          onLeave={() => router.push('/')}
        />
      )}
    </main>
  )
}