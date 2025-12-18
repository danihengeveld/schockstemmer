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

  // Fetch game data
  const data = useQuery(api.games.getGameWithDetails, { gameId })

  // Mutations
  const joinGame = useMutation(api.games.joinGame)
  const leaveGame = useMutation(api.games.leaveGame)

  // Local state
  const [showJoinDialog, setShowJoinDialog] = useState(false)

  // Derived state
  const game = data?.game
  const players = data?.players || []
  const activeRound = data?.activeRound
  const votes = data?.votes || []
  const rounds = data?.rounds || []

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
    <main className="min-h-screen bg-background p-4 flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
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

      {game?.status === "active" && activeRound?.status === "finished" && currentPlayer && (
        <ResultsView
          gameId={gameId}
          players={players}
          votes={votes}
          loserId={activeRound.loserId!}
          isHost={isHost}
          onLeave={handleLeave}
          currentPlayerId={currentPlayer._id}
        />
      )}

      {game?.status === "finished" && currentPlayer && (
        <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
          <h2 className="text-2xl font-bold">Game Session Ended</h2>
          <ResultsView
            gameId={gameId}
            players={players}
            votes={votes}
            loserId={activeRound?.loserId!}
            onLeave={handleLeave}
            currentPlayerId={currentPlayer._id}
          />
        </div>
      )}

      {/* Persistent History & Leaderboard */}
      <RoundHistory rounds={rounds} players={players} allVotes={data?.allVotes || []} />
    </main>
  )
}