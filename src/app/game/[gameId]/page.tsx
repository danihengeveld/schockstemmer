"use client"

import { GameCard } from "@/components/game/game-card"
import { JoinGameDialog } from "@/components/game/join-game-dialog"
import { LobbyView } from "@/components/game/lobby-view"
import { PendingView } from "@/components/game/pending-view"
import { ResultsView } from "@/components/game/results-view"
import { RoundHistory } from "@/components/game/round-history"
import { VotingView } from "@/components/game/voting-view"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

export default function GamePage() {
  const params = useParams()
  const gameId = params.gameId as Id<"games">
  const { user, isLoaded } = useUser()
  const router = useRouter()

  // Lightweight query — only current round votes
  const data = useQuery(api.games.getGame, { gameId })

  // Full history — only subscribed once rounds are finished
  const hasFinishedRounds = data?.rounds?.some((r) => r.status === "finished")
  const historyData = useQuery(
    api.games.getGameHistory,
    hasFinishedRounds ? { gameId } : "skip",
  )

  // Mutations
  const joinGame = useMutation(api.games.joinGame)
  const leaveGame = useMutation(api.games.leaveGame)

  // Local state
  const [showJoinDialog, setShowJoinDialog] = useState(false)

  // Derived state
  const game = data?.game
  const gameStatus = game?.status
  const players = data?.players ?? []
  const activeRound = data?.activeRound
  const votes = data?.currentVotes ?? []
  const rounds = data?.rounds ?? []

  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null)
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`schock_game_${gameId}`)
    if (stored) setLocalPlayerId(stored)
    setHasCheckedStorage(true)
  }, [gameId])

  const currentPlayer = players.find(p =>
    ((user && p.clerkId === user.id) ||
      (localPlayerId && p._id === localPlayerId)) &&
    !p.hasLeft
  )

  if (currentPlayer) {
    localStorage.setItem(`schock_game_${gameId}`, currentPlayer._id)
  }

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
      <div className="flex-1 flex items-center justify-center">
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
      </div>
    )
  }

  // Handlers
  const handleJoin = async (name: string) => {
    const result = await joinGame({
      gameId,
      guestName: name
    })

    if (result.success && result.playerId) {
      localStorage.setItem(`schock_game_${gameId}`, result.playerId)
      setLocalPlayerId(result.playerId)
    } else if (!result.success) {
      toast.error(result.error)
    }
  }

  const handleLeave = async () => {
    const playerId = currentPlayer?._id || localPlayerId
    if (playerId) {
      try {
        await leaveGame({ playerId: playerId as Id<"players"> })
        localStorage.removeItem(`schock_game_${gameId}`)
      } catch (err) {
        // Fallback for cleanup
        localStorage.removeItem(`schock_game_${gameId}`)
      }
    }
    router.push('/')
  }

  // View Routing
  if (showJoinDialog) {
    return <JoinGameDialog gameCode={game?.code} onJoin={handleJoin} />
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full py-4 sm:py-8">
      {game?.status === "lobby" && currentPlayer && (
        <LobbyView
          gameId={gameId}
          gameCode={game.code}
          players={players}
          isHost={isHost}
          currentPlayerId={currentPlayer._id}
        />
      )}

      {game?.status === "active" && activeRound?.status === "voting" && currentPlayer && (
        <VotingView
          roundId={activeRound._id}
          voterId={currentPlayer._id}
          players={players}
          currentPlayerId={currentPlayer._id}
          currentVote={votes.find(v => v.voterId === currentPlayer?._id)?.votedForId}
        />
      )}

      {game?.status === "active" && activeRound?.status === "pending" && currentPlayer && (
        <PendingView
          roundId={activeRound._id}
          players={players}
          isHost={isHost}
          currentPlayerId={currentPlayer._id}
        />
      )}

      {gameStatus === "active" && activeRound?.status === "finished" && currentPlayer && (
        <ResultsView
          gameId={gameId}
          players={players}
          votes={votes}
          loserId={activeRound.loserId!}
          isHost={isHost}
          onLeave={handleLeave}
          currentPlayerId={currentPlayer._id}
          gameStatus={gameStatus}
        />
      )}

      {gameStatus === "finished" && currentPlayer && (
        <ResultsView
          gameId={gameId}
          players={players}
          votes={votes}
          loserId={activeRound?.loserId!}
          isHost={isHost}
          onLeave={handleLeave}
          currentPlayerId={currentPlayer._id}
          gameStatus={gameStatus}
        />
      )}

      {/* Persistent History & Leaderboard */}
      <RoundHistory rounds={rounds} players={players} allVotes={historyData?.allVotes ?? []} />
    </div>
  )
}