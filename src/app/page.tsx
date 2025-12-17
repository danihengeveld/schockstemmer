"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMutation, useConvex } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useRouter } from "next/navigation"
import { SignInButton, useUser } from "@clerk/nextjs"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function Home() {
  const router = useRouter()
  const { user, isSignedIn } = useUser()
  const createGame = useMutation(api.games.createGame)
  const [joinCode, setJoinCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateGame = async () => {
    try {
      setIsCreating(true)
      const { gameId } = await createGame({})
      router.push(`/game/${gameId}`)
    } catch (error) {
      console.error("Failed to create game:", error)
      // Ideally show toast here
    } finally {
      setIsCreating(false)
    }
  }

  const convex = useConvex()
  const [isJoining, setIsJoining] = useState(false)

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode) return

    try {
      setIsJoining(true)
      const game = await convex.query(api.games.getGameByCode, { code: joinCode })

      if (game) {
        router.push(`/game/${game._id}`)
      } else {
        toast.error("Game not found! Please check the code.")
      }
    } catch (error) {
      console.error("Failed to join game:", error)
      toast.error("Failed to join game. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-12 max-w-4xl mx-auto w-full text-center">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-block p-2 px-4 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium mb-4">
            The Ultimate Schocken Companion
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
            Who will NOT lose?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Place your bets before the dice roll. The loser drinks, and so do their believers.
            Track history, manage sessions, and see who has the worst intuition.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isSignedIn ? (
              <Button size="lg" className="h-14 px-8 text-lg" onClick={handleCreateGame} disabled={isCreating}>
                {isCreating ? "Creating..." : "Start New Game"}
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button size="lg" className="h-14 px-8 text-lg">
                  Login to Host
                </Button>
              </SignInButton>
            )}

            <div className="flex items-center gap-2 border rounded-md p-1 pl-3 h-14 bg-background">
              <Input
                placeholder="Enter Game Code"
                className="border-0 focus-visible:ring-0 h-full w-40"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              {/* Note: This button does nothing currently as we need to resolve code -> ID */}
              <Button size="sm" className="h-full" disabled={!joinCode || isJoining} onClick={handleJoinGame}>
                {isJoining ? "..." : "Join"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left pt-12">
          <Card>
            <CardHeader>
              <CardTitle>🗳️ Vote</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Pick a friend who you think is safe. If they lose, you drink with them.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>⚡ Real-time</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Live updates as players join and vote. Instant results reveal.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>📊 History</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Keep track of who loses the most and who is the worst at predicting.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}