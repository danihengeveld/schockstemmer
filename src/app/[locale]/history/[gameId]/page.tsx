"use client"

import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { api } from "../../../../../convex/_generated/api"
import { Id, Doc } from "../../../../../convex/_generated/dataModel"
import { calculatePlayerShots } from "../../../../../convex/lib/helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  ArrowLeft01Icon,
  Calendar03Icon,
  UserGroupIcon,
  ChampionIcon,
  SkullIcon,
  DrinkIcon,
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
  const activePlayers = players.filter((p) => !p.hasLeft)
  const finishedRounds = rounds
    .filter((r) => r.status === "finished")
    .sort((a, b) => a.roundNumber - b.roundNumber)
  const totalRounds = finishedRounds.length

  // Player stats
  const playerStats = players
    .map((player) => ({
      ...player,
      totalShots: calculatePlayerShots(player, finishedRounds, allVotes),
      timesLost: finishedRounds.filter((r) => r.loserId === player._id).length,
    }))
    .sort((a, b) => b.totalShots - a.totalShots)

  const maxShots = Math.max(...playerStats.map((p) => p.totalShots), 1)
  const worstPlayer = playerStats.length > 0 && playerStats[0].totalShots > 0 ? playerStats[0] : null

  // Duration
  const startTime = game?._creationTime ?? 0
  const endTime = game?.finishedAt ?? Date.now()
  const durationMins = Math.round((endTime - startTime) / 60000)

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
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="h-3.5 w-3.5" />
                {t("min", { count: durationMins })}
              </span>
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

      {/* Hall of Shame / Leaderboard */}
      {playerStats.length > 0 && totalRounds > 0 && (
        <div className="w-full space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary/80">
            <HugeiconsIcon icon={ChampionIcon} strokeWidth={2} className="w-4 h-4" />
            {t("hallOfShame")}
          </h3>
          <div className="grid gap-2">
            {playerStats.map((player, index) => {
              const percentage = maxShots > 0 ? (player.totalShots / maxShots) * 100 : 0
              return (
                <div
                  key={player._id}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                    index === 0 && player.totalShots > 0
                      ? "bg-destructive/5 border-destructive/20 shadow-md"
                      : "bg-card/30 border-border/50"
                  }`}
                >
                  <span className="text-xs font-black w-6 text-muted-foreground text-center">
                    #{index + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate">
                        {player.name}
                        {player.hasLeft && (
                          <span className="text-muted-foreground font-normal ml-2 text-[10px]">
                            {t("left")}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-xl font-black text-foreground">
                          {player.totalShots}
                        </span>
                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">
                          {t("shots")}
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1.5">
                    </Progress>
                  </div>
                  {index === 0 && player.totalShots > 0 && (
                    <Badge
                      variant="destructive"
                      className="rounded-full h-5 text-[8px] px-1.5 font-black uppercase tracking-tighter shrink-0"
                    >
                      {t("worst")}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
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

      {/* Round-by-Round Details */}
      {finishedRounds.length > 0 && (
        <div className="w-full space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
            <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="w-4 h-4" />
            {t("roundDetails")}
          </h3>

          <Accordion>
            {finishedRounds.map((round) => {
              const roundVotes = allVotes.filter((v) => v.roundId === round._id)
              const loser = players.find((p) => p._id === round.loserId)
              const loserVote = roundVotes.find((v) => v.voterId === round.loserId)
              const loserVotedForSelf = loserVote?.votedForId === round.loserId
              const loserShots = loserVotedForSelf ? 2 : 1

              const drinkingBuddies = roundVotes
                .filter((v) => v.votedForId === round.loserId && v.voterId !== round.loserId)
                .map((v) => players.find((p) => p._id === v.voterId))
                .filter((p): p is Doc<"players"> => !!p)

              return (
                <AccordionItem key={round._id} value={round._id} className="border-none mb-2">
                  <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/30 rounded-xl transition-colors">
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-muted-foreground uppercase tracking-tighter">
                            {t("roundNumber", { number: round.roundNumber })}
                          </span>
                          {loser && (
                            <div className="flex items-center gap-1.5">
                              <HugeiconsIcon
                                icon={SkullIcon}
                                strokeWidth={2}
                                className="w-3.5 h-3.5 text-destructive"
                              />
                              <span className="font-bold text-sm">{loser.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {drinkingBuddies.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="rounded-full text-[10px] font-semibold"
                            >
                              <HugeiconsIcon
                                icon={DrinkIcon}
                                strokeWidth={2}
                                className="w-3 h-3 mr-1 text-amber-500"
                              />
                              {drinkingBuddies.length}
                            </Badge>
                          )}
                          {round.finishedAt && (
                            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                              {new Date(round.finishedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-2">
                        {/* Round Loser */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/15">
                          <Avatar className="h-12 w-12 border-2 border-destructive shadow-md">
                            <AvatarFallback className="bg-destructive text-destructive-foreground text-sm font-black">
                              {loser?.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-base truncate">{loser?.name}</p>
                            <p className="text-destructive text-xs font-bold uppercase tracking-widest">
                              {t("shotCount", { count: loserShots })}
                              {loserVotedForSelf && ` · ${t("selfVotePenalty")}`}
                            </p>
                          </div>
                          <HugeiconsIcon
                            icon={SkullIcon}
                            strokeWidth={2}
                            className="w-6 h-6 text-destructive/40 shrink-0"
                          />
                        </div>

                        {/* Drinking Buddies */}
                        {drinkingBuddies.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <HugeiconsIcon
                                icon={DrinkIcon}
                                strokeWidth={2}
                                className="w-3.5 h-3.5"
                              />
                              {t("drinkingBuddies")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("thoughtSafe", { name: loser?.name ?? "" })}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {drinkingBuddies.map((buddy) => (
                                <Badge
                                  key={buddy._id}
                                  variant="secondary"
                                  className="px-3 py-1 rounded-full"
                                >
                                  {buddy.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Voting Breakdown */}
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {t("votingBreakdown")}
                          </p>
                          <div className="grid gap-1.5">
                            {players
                              .filter((p) => roundVotes.some((v) => v.voterId === p._id))
                              .map((player) => {
                                const vote = roundVotes.find((v) => v.voterId === player._id)
                                const votedFor = players.find((p) => p._id === vote?.votedForId)
                                const isLoser = player._id === round.loserId
                                const isDrinkingBuddy =
                                  vote?.votedForId === round.loserId && !isLoser
                                const shots = isLoser
                                  ? loserVotedForSelf
                                    ? 2
                                    : 1
                                  : isDrinkingBuddy
                                    ? 1
                                    : 0

                                return (
                                  <div
                                    key={player._id}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                                      isLoser
                                        ? "bg-destructive/5 border border-destructive/15"
                                        : isDrinkingBuddy
                                          ? "bg-amber-500/5 border border-amber-500/15"
                                          : "bg-accent/20 border border-border/30"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-bold truncate">
                                        {player.name}
                                      </span>
                                      {shots > 0 && (
                                        <span className="text-[10px] text-destructive font-black uppercase tracking-tighter shrink-0">
                                          {t("shotCount", { count: shots })}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-muted-foreground hidden sm:inline">
                                        →
                                      </span>
                                      <span className="font-bold">{votedFor?.name}</span>
                                      {votedFor?._id === round.loserId ? (
                                        <Badge
                                          variant="destructive"
                                          className="rounded-full text-[9px] font-black tracking-widest uppercase px-1.5 h-4"
                                        >
                                          {t("wrong")}
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="rounded-full text-[9px] font-black tracking-widest uppercase bg-green-500/10 text-green-600 border-green-200 px-1.5 h-4"
                                        >
                                          {t("safe")}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </div>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      )}

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
