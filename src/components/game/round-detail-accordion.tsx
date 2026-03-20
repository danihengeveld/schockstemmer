import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Doc } from "../../../convex/_generated/dataModel"
import { deriveRoundResult } from "../../../convex/lib/helpers"
import { HugeiconsIcon } from "@hugeicons/react"
import { DrinkIcon, SkullIcon, TransactionHistoryIcon } from "@hugeicons/core-free-icons"
import { useTranslations } from "next-intl"

interface RoundDetailAccordionProps {
  rounds: Doc<"rounds">[]
  players: Doc<"players">[]
  allVotes: Doc<"votes">[]
  /** Section heading — defaults to the shared "Round History" translation. */
  heading?: string
}

export function RoundDetailAccordion({ rounds, players, allVotes, heading }: RoundDetailAccordionProps) {
  const t = useTranslations("GameSummary")

  const finishedRounds = rounds
    .filter(r => r.status === "finished")
    .sort((a, b) => b.roundNumber - a.roundNumber)

  if (finishedRounds.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
        <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="w-4 h-4" />
        {heading ?? t("roundHistory")}
      </h3>

      <Accordion>
        {finishedRounds.map((round) => {
          if (!round.loserId) return null
          const roundVotes = allVotes.filter(v => v.roundId === round._id)
          const { loser, loserVotedForSelf, loserShots, drinkingBuddies } =
            deriveRoundResult(round.loserId, players, roundVotes)

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
                          <HugeiconsIcon icon={SkullIcon} strokeWidth={2} className="w-3.5 h-3.5 text-destructive" />
                          <span className="font-bold text-sm">{loser.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {drinkingBuddies.length > 0 && (
                        <Badge variant="secondary" className="rounded-full text-[10px] font-semibold">
                          <HugeiconsIcon icon={DrinkIcon} strokeWidth={2} className="w-3 h-3 mr-1 text-amber-500" />
                          {drinkingBuddies.length}
                        </Badge>
                      )}
                      {round.finishedAt && (
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                          {new Date(round.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      <HugeiconsIcon icon={SkullIcon} strokeWidth={2} className="w-6 h-6 text-destructive/40 shrink-0" />
                    </div>

                    {/* Drinking Buddies */}
                    {drinkingBuddies.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <HugeiconsIcon icon={DrinkIcon} strokeWidth={2} className="w-3.5 h-3.5" />
                          {t("drinkingBuddies")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("thoughtSafe", { name: loser?.name ?? "" })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {drinkingBuddies.map(buddy => (
                            <Badge key={buddy._id} variant="secondary" className="px-3 py-1 rounded-full">
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
                          .filter(p => roundVotes.some(v => v.voterId === p._id))
                          .map(player => {
                            const vote = roundVotes.find(v => v.voterId === player._id)
                            const votedFor = players.find(p => p._id === vote?.votedForId)
                            const isLoser = player._id === round.loserId
                            const isDrinkingBuddy = vote?.votedForId === round.loserId && !isLoser
                            const shots = isLoser ? (loserVotedForSelf ? 2 : 1) : (isDrinkingBuddy ? 1 : 0)

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
                                  <span className="font-bold truncate">{player.name}</span>
                                  {shots > 0 && (
                                    <span className="text-[10px] text-destructive font-black uppercase tracking-tighter shrink-0">
                                      {t("shotCount", { count: shots })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-muted-foreground text-xs">→</span>
                                  <span className="font-bold">{votedFor?.name}</span>
                                  {votedFor?._id === round.loserId ? (
                                    <Badge variant="destructive" className="rounded-full text-[9px] font-black tracking-widest uppercase px-1.5 h-4">
                                      {t("wrong")}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="rounded-full text-[9px] font-black tracking-widest uppercase bg-green-500/10 text-green-600 border-green-200 px-1.5 h-4">
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
  )
}
