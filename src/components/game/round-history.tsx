"use client"

import { Doc } from "../../../convex/_generated/dataModel"
import { Leaderboard } from "./leaderboard"
import { RoundDetailAccordion } from "./round-detail-accordion"
import { useTranslations } from "next-intl"

interface RoundHistoryProps {
  rounds: Doc<"rounds">[]
  players: Doc<"players">[]
  allVotes: Doc<"votes">[]
}

export function RoundHistory({ rounds, players, allVotes }: RoundHistoryProps) {
  const t = useTranslations("RoundHistory")
  const finishedRounds = rounds.filter(r => r.status === "finished")

  if (rounds.length === 0) return null

  return (
    <div className="w-full max-w-2xl mt-8 sm:mt-12 space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-1000">
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border/50"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50">{t("sessionSummary")}</span>
        </div>
      </div>

      <div className="grid gap-6">
        <Leaderboard players={players} finishedRounds={finishedRounds} allVotes={allVotes} />
        <RoundDetailAccordion rounds={rounds} players={players} allVotes={allVotes} />
      </div>
    </div>
  )
}
