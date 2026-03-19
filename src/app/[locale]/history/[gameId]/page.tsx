"use client"

import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { api } from "../../../../../convex/_generated/api"
import { Id } from "../../../../../convex/_generated/dataModel"
import { calculatePlayerShots } from "../../../../../convex/lib/helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Leaderboard } from "@/components/game/leaderboard"
import { RoundDetailAccordion } from "@/components/game/round-detail-accordion"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  ArrowLeft01Icon,
  Calendar03Icon,
  UserGroupIcon,
  TransactionHistoryIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { useTranslations } from "next-intl"

export default function HistoryDetailPage() {
  const t = useTranslations("HistoryDetail")
  const params = useParams()
  const gameId = params.gameId as Id<"games">
  const data = useQuery(api.games.getGameHistory, { gameId })

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <HugeiconsIcon
          icon={Loading03Icon}
          strokeWidth={2}
          className="h-8 w-8 animate-spin text-primary"
        />
      </div>
    )
  }

  const { game, players, rounds, allVotes } = data
  const finishedRounds = rounds
    .filter((r) => r.status === "finished")
    .sort((a, b) => a.roundNumber - b.roundNumber)
  const totalRounds = finishedRounds.length

  // Player stats — only needed for the "biggest loser" card
  const playerStats = players
    .map((player) => ({
      ...player,
      totalShots: calculatePlayerShots(player, finishedRounds, allVotes),
      timesLost: finishedRounds.filter((r) => r.loserId === player._id).length,
    }))
    .sort((a, b) => b.totalShots - a.totalShots)

  const worstPlayer = playerStats.length > 0 && playerStats[0].totalShots > 0 ? playerStats[0] : null

  // Duration — only compute for finished games (Date.now() is impure in render)
  const startTime = game?._creationTime ?? 0
  const durationMins = game?.finishedAt
    ? Math.round((game.finishedAt - startTime) / 60000)
    : null

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto space-y-8 py-4">
      {/* Navigation */}
      <div className="w-full flex items-center gap-3">
        <Link href="/history">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="h-4 w-4" />
            {t("backToHistory")}
          </Button>
        </Link>
      </div>

      {/* Game Header */}
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {t("gameTitle", { code: game?.code })}
              </h1>
              <Badge
                variant={game?.status === "finished" ? "secondary" : "default"}
                className={`capitalize rounded-full ${game?.status !== "finished" ? "animate-pulse" : "bg-secondary/50"}`}
              >
                {game?.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="h-3.5 w-3.5" />
                {new Date(startTime).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {durationMins !== null && (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="h-3.5 w-3.5" />
                  {t("min", { count: durationMins })}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="h-3.5 w-3.5" />
                {t("players", { count: players.length })}
              </span>
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="h-3.5 w-3.5" />
                {t("rounds", { count: totalRounds })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* The Big Loser Card */}
      {worstPlayer && totalRounds > 0 && (
        <Card className="w-full rounded-xl border border-destructive/20 shadow-xl overflow-hidden relative bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-destructive/5 pointer-events-none z-0" />
          <CardHeader className="text-center pb-2 relative z-10">
            <CardTitle className="text-lg uppercase tracking-widest text-destructive font-black">
              {totalRounds > 1 ? t("biggestLoser") : t("theLoser")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6 relative z-10">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-destructive shadow-xl ring-4 ring-destructive/20">
              <AvatarFallback className="bg-destructive text-destructive-foreground text-2xl sm:text-3xl font-black">
                {worstPlayer.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{worstPlayer.name}</h2>
              <p className="text-destructive font-bold text-sm uppercase tracking-widest">
                {t("shotsTotal", { count: worstPlayer.totalShots })}
              </p>
              {totalRounds > 1 && (
                <p className="text-xs text-muted-foreground">
                  {t("lostRounds", { timesLost: worstPlayer.timesLost, totalRounds })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hall of Shame / Leaderboard — shared component */}
      {totalRounds > 0 && (
        <div className="w-full space-y-4">
          <Leaderboard players={players} finishedRounds={finishedRounds} allVotes={allVotes} />
          {totalRounds > 1 && (
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {t("acrossRounds", { totalRounds, playerCount: players.length })}
              </p>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Round-by-Round Details — shared component */}
      <div className="w-full">
        <RoundDetailAccordion
          rounds={rounds}
          players={players}
          allVotes={allVotes}
          heading={t("roundDetails")}
        />
      </div>

      {/* Empty state for games with no rounds */}
      {finishedRounds.length === 0 && (
        <Card className="w-full bg-card/50 backdrop-blur-sm border-dashed rounded-xl py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
              <HugeiconsIcon
                icon={TransactionHistoryIcon}
                strokeWidth={2}
                className="h-8 w-8 text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">{t("noRoundsTitle")}</CardTitle>
              <p className="text-muted-foreground max-w-sm">
                {t("noRoundsDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
