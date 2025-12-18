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
import { RoundHistory } from "@/components/game/round-history"

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
    const pId = currentPlayer?._id || localPlayerId
    if (pId) {
      try {
        await leaveGame({ playerId: pId as Id<"players"> })
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
      {game?.status === "lobby" && (
        <LobbyView
          gameId={gameId}
          gameCode={game.code}
          players={players}
          isHost={isHost}
          currentUserId={currentPlayer?._id || null}
        />
      )}

      {game?.status === "active" && activeRound?.status === "voting" && currentPlayer && (
        <VotingView
          roundId={activeRound._id}
          voterId={currentPlayer._id}
          players={players}
          currentPlayer={currentPlayer}
          currentVote={votes.find(v => v.voterId === currentPlayer?._id)?.votedForId}
        />
      )}

      {game?.status === "active" && activeRound?.status === "pending" && (
        <PendingView
          roundId={activeRound._id}
          players={players}
          isHost={isHost}
        />
      )}

      {game?.status === "active" && activeRound?.status === "finished" && (
        <ResultsView
          gameId={gameId}
          players={players}
          votes={votes}
          loserId={activeRound.loserId!}
          isHost={isHost}
          onLeave={handleLeave}
        />
      )}

      {game?.status === "finished" && (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Game Session Ended</h2>
          <ResultsView
            gameId={gameId}
            players={players}
            votes={votes}
            loserId={activeRound?.loserId!}
            onLeave={handleLeave}
          />
        </div>
      )}

      {/* Persistent History & Leaderboard */}
      <RoundHistory rounds={rounds} players={players} allVotes={data?.allVotes || []} />
    </main>
  )
}