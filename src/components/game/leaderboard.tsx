import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Doc } from "../../../convex/_generated/dataModel"
import { calculatePlayerShots } from "../../../convex/lib/helpers"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChampionIcon } from "@hugeicons/core-free-icons"
import { useTranslations } from "next-intl"

interface LeaderboardProps {
  players: Doc<"players">[]
  finishedRounds: Doc<"rounds">[]
  allVotes: Doc<"votes">[]
}

export function Leaderboard({ players, finishedRounds, allVotes }: LeaderboardProps) {
  const t = useTranslations("GameSummary")

  const stats = players.map(player => ({
    ...player,
    totalShots: calculatePlayerShots(player, finishedRounds, allVotes),
  })).sort((a, b) => b.totalShots - a.totalShots)

  const maxShots = Math.max(...stats.map(p => p.totalShots), 1)

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary/80">
        <HugeiconsIcon icon={ChampionIcon} strokeWidth={2} className="w-4 h-4" />
        {t("hallOfShame")}
      </h3>
      <div className="grid gap-2">
        {stats.map((player, index) => {
          const percentage = maxShots > 0 ? (player.totalShots / maxShots) * 100 : 0
          return (
            <div
              key={player._id}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${index === 0 && player.totalShots > 0
                ? "bg-destructive/5 border-destructive/20 shadow-md"
                : "bg-card/30 border-border/50"
                }`}
            >
              <span className="text-xs font-black w-6 text-muted-foreground text-center">#{index + 1}</span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold truncate">
                    {player.name}
                    {player.hasLeft && <span className="text-muted-foreground font-normal ml-2 text-[10px]">{t("left")}</span>}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-xl font-black text-foreground">{player.totalShots}</span>
                    <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">{t("shots")}</span>
                  </div>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
              {index === 0 && player.totalShots > 0 && (
                <Badge variant="destructive" className="rounded-full h-5 text-[8px] px-1.5 font-black uppercase tracking-tighter shrink-0">
                  {t("worst")}
                </Badge>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
