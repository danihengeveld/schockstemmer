import { Badge } from "@/components/ui/badge"
import { Doc, Id } from "../../../../convex/_generated/dataModel"

interface VotingBreakdownProps {
  players: Doc<"players">[]
  votes: Doc<"votes">[]
  loserId: Id<"players">
  loserVotedForSelf: boolean
}

export function VotingBreakdown({ players, votes, loserId, loserVotedForSelf }: VotingBreakdownProps) {
  return (
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
  )
}
