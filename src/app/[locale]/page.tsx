"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMutation, useConvex } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useRouter } from "@/i18n/navigation"
import { SignInButton, useUser } from "@clerk/nextjs"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Key01Icon, Megaphone01Icon, FlashIcon, ChartHistogramIcon } from "@hugeicons/core-free-icons"
import { useTranslations } from "next-intl"

export default function Home() {
  const t = useTranslations("HomePage")
  const router = useRouter()
  const { isSignedIn } = useUser()
  const createGame = useMutation(api.games.createGame)
  const [joinCode, setJoinCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateGame = async () => {
    try {
      setIsCreating(true)
      const { gameId, playerId } = await createGame({})
      localStorage.setItem(`schock_game_${gameId}`, playerId)
      router.push(`/game/${gameId}`)
    } catch (error) {
      console.error("Failed to create game:", error)
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
        toast.error(t("gameNotFound"))
      }
    } catch (error) {
      console.error("Failed to join game:", error)
      toast.error(t("joinFailed"))
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 sm:gap-16 py-4 sm:py-16">
      {/* Hero */}
      <div className="flex flex-col items-center text-center gap-4 sm:gap-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="inline-block px-4 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium">
          {t("badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
          {t("title")}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
          {t("subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-lg">
          {isSignedIn ? (
            <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-md hover:shadow-lg transition-all w-full sm:w-auto" onClick={handleCreateGame} disabled={isCreating}>
              {isCreating ? t("creating") : t("startNewGame")}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-md hover:shadow-lg transition-all w-full sm:w-auto">
                {t("loginToHost")}
              </Button>
            </SignInButton>
          )}

          <form onSubmit={handleJoinGame} className="relative flex items-center w-full sm:w-auto">
            <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="absolute left-4 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              placeholder={t("gameCodePlaceholder")}
              className="h-12 pl-10 pr-20 border shadow-sm w-full sm:w-56 focus-visible:ring-primary rounded-full"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <Button type="submit" size="sm" className="absolute right-1.5 rounded-full px-4 h-9" disabled={!joinCode || isJoining}>
              {isJoining ? t("joining") : t("join")}
            </Button>
          </form>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <Card className="rounded-xl border-border bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <HugeiconsIcon icon={Megaphone01Icon} strokeWidth={2} className="h-4 w-4 text-primary" />
              </div>
              {t("voteTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("voteDescription")}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <HugeiconsIcon icon={FlashIcon} strokeWidth={2} className="h-4 w-4 text-primary" />
              </div>
              {t("realtimeTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("realtimeDescription")}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <HugeiconsIcon icon={ChartHistogramIcon} strokeWidth={2} className="h-4 w-4 text-primary" />
              </div>
              {t("historyTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("historyDescription")}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
