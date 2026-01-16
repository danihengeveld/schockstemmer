"use client"

import { Badge } from "@/components/ui/badge"
import { Doc } from "../../../convex/_generated/dataModel"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChampionIcon, TransactionHistoryIcon } from "@hugeicons/core-free-icons"

interface RoundHistoryProps {
  rounds: Doc<"rounds">[]
  players: Doc<"players">[]
  allVotes: Doc<"votes">[]
}

export function RoundHistory({ rounds, players, allVotes }: RoundHistoryProps) {
  const finishedRounds = rounds.filter(r => r.status === "finished").sort((a, b) => b.roundNumber - a.roundNumber)

  // Calculate leaderboard (total shots)
  const stats = players.map(player => {
    let totalShots = 0
    rounds.forEach(round => {
      if (round.status !== "finished" || !round.loserId) return

      const roundVotes = allVotes.filter(v => v.roundId === round._id)
      const isLoser = round.loserId === player._id
      const playerVote = roundVotes.find(v => v.voterId === player._id)
      const votedForLoser = playerVote?.votedForId === round.loserId

      if (isLoser) {
        // Loser drinks 1, or 2 if they voted for themselves
        const selfVoted = playerVote?.votedForId === player._id
        totalShots += selfVoted ? 2 : 1
      } else if (votedForLoser) {
        // Safe players who voted for the loser drink 1
        totalShots += 1
      }
    })
    return { ...player, totalShots }
  }).sort((a, b) => b.totalShots - a.totalShots)

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
            {stats.map((player, index) => (
              <div
                key={player._id}
                className={`flex justify-between items-center p-3 rounded-xl border transition-all ${index === 0 && player.totalShots > 0
                  ? "bg-destructive/5 border-destructive/20 shadow-md"
                  : "bg-card/30 border-border/50"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black w-4 text-muted-foreground">#{index + 1}</span>
                  <span className="font-bold">{player.name}{player.hasLeft && <span className="text-muted-foreground font-normal ml-2 text-[10px]">(Left)</span>}</span>
                  {index === 0 && player.totalShots > 0 && <Badge variant="destructive" className="rounded-full h-4 text-[8px] px-1.5 font-black uppercase tracking-tighter">Current Loser</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-foreground">{player.totalShots}</span>
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Shots</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Round List */}
        {finishedRounds.length > 0 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
              <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} className="w-4 h-4" />
              Round History
            </h3>
            <div className="grid gap-2">
              {finishedRounds.map((round) => {
                const loser = players.find(p => p._id === round.loserId)
                return (
                  <div key={round._id} className="flex justify-between items-center px-4 py-3 rounded-xl bg-accent/20 border border-border/30 text-xs">
                    <span className="font-black text-muted-foreground uppercase tracking-tighter">Round {round.roundNumber}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Loser:</span>
                        <span className="font-bold text-foreground">{loser?.name}</span>
                      </div>
                      {round.finishedAt && (
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                          {new Date(round.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
