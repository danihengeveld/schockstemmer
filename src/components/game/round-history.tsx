"use client"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Doc } from "../../../convex/_generated/dataModel"
import { calculatePlayerShots } from "../../../convex/lib/helpers"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChampionIcon, DrinkIcon, SkullIcon, TransactionHistoryIcon } from "@hugeicons/core-free-icons"

interface RoundHistoryProps {
  rounds: Doc<"rounds">[]
  players: Doc<"players">[]
  allVotes: Doc<"votes">[]
}

export function RoundHistory({ rounds, players, allVotes }: RoundHistoryProps) {
  const finishedRounds = rounds.filter(r => r.status === "finished").sort((a, b) => b.roundNumber - a.roundNumber)

  // Calculate leaderboard (total shots) using shared helper
  const stats = players.map(player => ({
    ...player,
    totalShots: calculatePlayerShots(player, finishedRounds, allVotes),
  })).sort((a, b) => b.totalShots - a.totalShots)

  const maxShots = Math.max(...stats.map(p => p.totalShots), 1)

  if (rounds.length === 0) return null

  return (
    <div className="w-full max-w-2xl mt-12 space-y-8 animate-in slide-in-from-bottom-4 duration-1000">
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border/50"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50">Session Summary</span>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Leaderboard */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary/80">
            <HugeiconsIcon icon={ChampionIcon} strokeWidth={2} className="w-4 h-4" />
            Hall of Shame
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
                        {player.hasLeft && <span className="text-muted-foreground font-normal ml-2 text-[10px]">(Left)</span>}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-xl font-black text-foreground">{player.totalShots}</span>
                        <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Shots</span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1.5">
                    </Progress>
                  </div>
                  {index === 0 && player.totalShots > 0 && (
                    <Badge variant="destructive" className="rounded-full h-5 text-[8px] px-1.5 font-black uppercase tracking-tighter shrink-0">
                      Worst
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Round Details */}
        {finishedRounds.length > 0 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
              <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="w-4 h-4" />
              Round History
            </h3>

            <Accordion>
              {finishedRounds.map((round) => {
                const roundVotes = allVotes.filter(v => v.roundId === round._id)
                const loser = players.find(p => p._id === round.loserId)
                const loserVote = roundVotes.find(v => v.voterId === round.loserId)
                const loserVotedForSelf = loserVote?.votedForId === round.loserId
                const loserShots = loserVotedForSelf ? 2 : 1

                const drinkingBuddies = roundVotes
                  .filter(v => v.votedForId === round.loserId && v.voterId !== round.loserId)
                  .map(v => players.find(p => p._id === v.voterId))
                  .filter((p): p is Doc<"players"> => !!p)

                return (
                  <AccordionItem key={round._id} value={round._id} className="border-none mb-2">
                    <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/30 rounded-xl transition-colors">
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-tighter">
                              Round {round.roundNumber}
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
                                {loserShots} {loserShots === 1 ? "shot" : "shots"}
                                {loserVotedForSelf && " · Self-Vote Penalty ×2"}
                              </p>
                            </div>
                            <HugeiconsIcon icon={SkullIcon} strokeWidth={2} className="w-6 h-6 text-destructive/40 shrink-0" />
                          </div>

                          {/* Drinking Buddies */}
                          {drinkingBuddies.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <HugeiconsIcon icon={DrinkIcon} strokeWidth={2} className="w-3.5 h-3.5" />
                                Drinking Buddies
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Thought {loser?.name} was safe — 1 shot each!
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
                              Voting Breakdown
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
                                            {shots} {shots === 1 ? "shot" : "shots"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-muted-foreground hidden sm:inline">→</span>
                                        <span className="font-bold">{votedFor?.name}</span>
                                        {votedFor?._id === round.loserId ? (
                                          <Badge variant="destructive" className="rounded-full text-[9px] font-black tracking-widest uppercase px-1.5 h-4">
                                            Wrong
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="rounded-full text-[9px] font-black tracking-widest uppercase bg-green-500/10 text-green-600 border-green-200 px-1.5 h-4">
                                            Safe
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
      </div>
    </div>
  )
}
