"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Loading03Icon,
  UserGroupIcon,
  ChampionIcon,
  Calendar03Icon,
  ArrowUpRight01Icon,
  TransactionHistoryIcon
} from "@hugeicons/core-free-icons"
import { useTranslations } from "next-intl"

export default function HistoryPage() {
  const t = useTranslations("HistoryPage")
  const games = useQuery(api.games.getUserGames)

  if (!games) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full space-y-8 py-4">
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-b pb-4 sm:pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2 sm:gap-3">
            <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="h-7 w-7 text-primary" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {games.length === 0 ? (
        <Card className="w-full bg-card/50 backdrop-blur-sm border-dashed rounded-xl py-12">
          <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center">
              <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">{t("noGamesTitle")}</CardTitle>
              <p className="text-muted-foreground max-w-sm">
                {t("noGamesDescription")}
              </p>
            </div>
            <Link href="/">
              <Button size="lg" className="rounded-full px-8">{t("startGame")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid w-full gap-6">
          {games.map((game) => (
            <Card key={game._id} className="group overflow-hidden border-border transition-all hover:border-primary/50 hover:shadow-lg bg-card/50 backdrop-blur-sm rounded-xl relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top rounded-l-xl" />
              <CardHeader className="flex flex-row items-start sm:items-center justify-between pb-2 space-y-0 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold tracking-tight">
                      {t("gameTitle", { code: game.code })}
                    </CardTitle>
                    <Badge
                      variant={game.status === "finished" ? "secondary" : "default"}
                      className={`capitalize rounded-full ${game.status === "finished" ? "bg-secondary/50" : "animate-pulse"}`}
                    >
                      {game.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="h-3 w-3" />
                      {new Date(game._creationTime).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="h-3 w-3" />
                      {t("players", { count: game.playerCount })}
                    </span>
                    {game.totalRounds > 0 && (
                      <span className="flex items-center gap-1 text-primary font-semibold">
                        {t("rounds", { count: game.totalRounds })}
                      </span>
                    )}
                  </div>
                </div>
                <Link href={`/history/${game._id}`}>
                  <Button variant="ghost" size="icon-lg" className="rounded-full hover:bg-primary hover:text-primary-foreground transition-colors shrink-0">
                    <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pb-4">
                {game.status === "finished" ? (
                  <div className="space-y-3">
                    {game.totalRounds > 1 && (
                      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs text-center text-muted-foreground">
                          <span className="font-bold text-primary">{t("roundsPlayed", { count: game.totalRounds })}</span>
                          {' · '}
                          <span className="text-primary/80">{t("viewDetailsBreakdown")}</span>
                        </p>
                      </div>
                    )}
                    <div className="p-2.5 sm:p-3 rounded-xl bg-accent/30 border border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <HugeiconsIcon icon={ChampionIcon} strokeWidth={2} className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {game.totalRounds > 1 ? t("worstPlayer") : t("theLoser")}
                          </p>
                          <p className="text-sm font-bold truncate max-w-37.5 sm:max-w-xs">
                            {game.totalRounds > 1 ? game.worstPlayerName || t("unknown") : game.loserName || t("unknown")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {game.totalRounds > 1 ? t("totalShots") : t("duration")}
                        </p>
                        <p className="text-sm font-medium">
                          {game.totalRounds > 1
                            ? game.worstPlayerShots
                            : (game.finishedAt ? t("mins", { count: Math.round((game.finishedAt - game._creationTime) / 60000) }) : t("na"))
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic px-2">
                    {t("inProgress")}
                  </p>
                )}
              </CardContent>
              <CardFooter className="pt-2 pb-3 border-t bg-accent/5 flex justify-end items-center px-4 sm:px-6">
                <Link href={`/history/${game._id}`} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 py-1 transition-all">
                  {t("viewDetails")} <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="h-3.5 w-3.5" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
