"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMutation } from "convex/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DrinkIcon,
  Logout01Icon,
  ShutDownIcon,
  SkullIcon
} from "@hugeicons/core-free-icons"
import { api } from "../../../convex/_generated/api"
import { Doc, Id } from "../../../convex/_generated/dataModel"

interface ResultsViewProps {
  gameId: Id<"games">
  players: Doc<"players">[]
  votes: Doc<"votes">[]
  loserId: Id<"players">
  isHost?: boolean
  onLeave: () => void
  currentPlayerId: Id<"players">
  gameStatus?: string
}

export function ResultsView({ gameId, players, votes, loserId, isHost, onLeave, currentPlayerId, gameStatus }: ResultsViewProps) {
  const startNextRound = useMutation(api.games.startNextRound)
  const finishGame = useMutation(api.games.finishGame)

  const handleNextRound = async () => {
    await startNextRound({ gameId, playerId: currentPlayerId })
  }

  const handleFinishGame = async () => {
    await finishGame({ gameId, playerId: currentPlayerId })
  }

  const loser = players.find(p => p._id === loserId)
  const loserVote = votes.find(v => v.voterId === loserId)
  const loserVotedForSelf = loserVote?.votedForId === loserId

  // Calculate shots for the loser
  const loserShots = loserVotedForSelf ? 2 : 1

  // Who voted for the loser? (Drinking Buddies)
  const drinkingBuddies = votes
    .filter(v => v.votedForId === loserId && v.voterId !== loserId)
    .map(v => players.find(p => p._id === v.voterId))
    .filter((p): p is Doc<"players"> => !!p)

  // Calculate vote counts
  const voteCounts = new Map<string, number>()
  votes.forEach(v => {
    const count = voteCounts.get(v.votedForId) || 0
    voteCounts.set(v.votedForId, count + 1)
  })

  return (
    <div className="w-full max-w-2xl space-y-8 animate-in fade-in duration-700 py-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-destructive/10 text-destructive mb-4 animate-bounce">
          <HugeiconsIcon icon={SkullIcon} strokeWidth={2} className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tight underline decoration-destructive/30 underline-offset-8">ROUND OVER</h1>
        <p className="text-muted-foreground text-lg">The results are in...</p>
      </div>

      <Card className="rounded-xl border border-destructive/20 shadow-xl overflow-hidden relative bg-card/50 backdrop-blur-sm transition-all hover:shadow-destructive/5 hover:border-destructive/40">
        <div className="absolute inset-0 bg-destructive/5 pointer-events-none z-0" />
        <CardHeader className="text-center pb-2 relative z-10">
          <CardTitle className="text-xl uppercase tracking-widest text-destructive font-black">The Loser</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8 relative z-10">
          <Avatar className="h-32 w-32 border-4 border-destructive shadow-xl ring-4 ring-destructive/20">
            <AvatarFallback className="bg-destructive text-destructive-foreground text-4xl font-black">
              {loser?.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center space-y-1">
            <h2 className="text-4xl font-black tracking-tight">{loser?.name}</h2>
            <div className="flex flex-col items-center gap-1">
              <p className="text-destructive font-bold animate-pulse text-sm uppercase tracking-widest">
                Has to take {loserShots} {loserShots === 1 ? 'shot' : 'shots'}!
              </p>
              {loserVotedForSelf && (
                <Badge variant="destructive" className="rounded-full text-[10px] uppercase font-black tracking-widest">
                  Self-Vote Penalty x2
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {drinkingBuddies.length > 0 && (
        <Card className="rounded-xl bg-accent/30 border border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <HugeiconsIcon icon={DrinkIcon} strokeWidth={2} className="w-5 h-5 text-amber-500" />
              Drinking Buddies
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These people thought {loser?.name} was safe. 1 shot each!
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {drinkingBuddies.map(buddy => (
                <Badge key={buddy._id} variant="secondary" className="px-3 py-1 rounded-full">
                  {buddy.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 pt-8">
        <h3 className="text-center text-xs font-bold uppercase text-muted-foreground tracking-widest">Full Voting Breakdown</h3>
        <div className="grid gap-3">
          {players.map(player => {
            const vote = votes.find(v => v.voterId === player._id)
            const votedFor = players.find(p => p._id === vote?.votedForId)
            const isLoser = player._id === loserId
            const isDrinkingBuddy = vote?.votedForId === loserId && !isLoser
            const shots = isLoser ? (loserVotedForSelf ? 2 : 1) : (isDrinkingBuddy ? 1 : 0)

            return (
              <div key={player._id} className="flex justify-between items-center p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border shadow-sm text-sm transition-all hover:scale-[1.01]">
                <div className="flex flex-col">
                  <span className="font-bold">{player.name}{player.hasLeft && <span className="text-muted-foreground font-normal ml-1">(Left)</span>}</span>
                  {shots > 0 && (
                    <span className="text-[10px] text-destructive font-black uppercase tracking-tighter">
                      Take {shots} {shots === 1 ? 'shot' : 'shots'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground font-medium text-right">
                  <span className="hidden sm:inline">voted for</span>
                  <span className="font-black text-foreground">{votedFor?.name || "Unknown"}</span>
                  {votedFor?._id === loserId ? (
                    <Badge variant="destructive" className="ml-2 rounded-full text-[10px] font-black tracking-widest uppercase">INCORRECT</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2 rounded-full text-[10px] font-black tracking-widest uppercase bg-green-500/10 text-green-600 border-green-200">SAFE</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pt-8 pb-12">
        {isHost && (
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Button size="lg" onClick={handleNextRound} className="flex-1 sm:flex-none min-w-[200px] rounded-full shadow-lg hover:shadow-xl transition-all font-black uppercase tracking-widest">
              Next Round
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="lg"
                    variant="secondary"
                    className="flex-1 sm:flex-none min-w-[200px] rounded-full shadow-md hover:shadow-lg transition-all font-black uppercase tracking-widest"
                  >
                    <HugeiconsIcon icon={ShutDownIcon} strokeWidth={2} className="w-4 h-4 mr-2" />
                    End Session
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End Game Session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to end this session? This will finish the game for all players and prevent any further rounds.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinishGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    End Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {gameStatus !== "finished" && (
          <Button size="lg" variant="outline" onClick={onLeave} className="min-w-[200px] rounded-full shadow-sm hover:shadow-md transition-all">
            <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="w-4 h-4 mr-2" />
            <span>Leave Game</span>
          </Button>
        )}
      </div>
    </div>
  )
}
