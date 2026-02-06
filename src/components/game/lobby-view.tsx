import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Id } from "../../../convex/_generated/dataModel"
import { Doc } from "../../../convex/_generated/dataModel"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  UserGroupIcon,
  Share01Icon,
  CheckmarkCircle02Icon
} from "@hugeicons/core-free-icons"
import { useState } from "react"
import { useTranslations } from "next-intl"

interface LobbyViewProps {
  gameId: Id<"games">
  gameCode: string
  players: Doc<"players">[]
  isHost: boolean
  currentPlayerId: Id<"players">
}

export function LobbyView({ gameId, gameCode, players, isHost, currentPlayerId }: LobbyViewProps) {
  const t = useTranslations("Lobby")
  const startGame = useMutation(api.games.startGame)
  const [copied, setCopied] = useState(false)

  const handleStartGame = async () => {
    await startGame({ gameId, playerId: currentPlayerId })
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = t("shareTitle")
    const text = t("shareText", { code: gameCode })

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        toast.success(t("sharedSuccess"))
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error(t("shareFailed"))
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        toast.success(t("linkCopied"))
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error(t("copyFailed"))
      }
    }
  }

  const headerContent = (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">{t("joinCode")}</span>
      <div className="text-4xl sm:text-6xl font-black tracking-tighter text-primary animate-in zoom-in duration-500">
        {gameCode}
      </div>
    </div>
  )

  const title = (
    <div className="flex items-center justify-center gap-2 text-xl font-normal">
      <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="w-5 h-5 animate-spin text-muted-foreground" />
      {t("waitingForPlayers")}
    </div>
  )

  return (
    <GameCard headerContent={headerContent} title={title}>
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="w-4 h-4" />
          {t("playersJoined", { count: players.length })}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {players.filter(p => !p.hasLeft).map((player) => (
            <div
              key={player._id}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border shadow-sm transition-all active:scale-[0.98]"
            >
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {player.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">{player.name}</span>
                {player.isHost && <span className="text-[10px] uppercase font-bold text-primary tracking-wide">{t("host")}</span>}
              </div>
              {player._id === currentPlayerId && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{t("you")}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {isHost ? (
          <Button
            className="w-full h-12 text-lg font-bold rounded-full shadow-md hover:shadow-lg transition-all"
            size="lg"
            onClick={handleStartGame}
          >
            {t("startVoting")}
          </Button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-secondary/50 text-muted-foreground text-sm animate-pulse">
            {t("waitingForHost")}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full h-10 rounded-full border-dashed"
          onClick={handleShare}
        >
          {copied ? (
            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="w-4 h-4 mr-2 text-green-500" />
          ) : (
            <HugeiconsIcon icon={Share01Icon} strokeWidth={2} className="w-4 h-4 mr-2" />
          )}
          {copied ? t("copied") : t("inviteFriends")}
        </Button>
      </div>
    </GameCard>
  )
}
