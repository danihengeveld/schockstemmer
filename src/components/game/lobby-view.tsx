import { GameCard } from "@/components/game/game-card"
import { Button } from "@/components/ui/button"
import { Id } from "../../../convex/_generated/dataModel"
import { Doc } from "../../../convex/_generated/dataModel"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Users } from "lucide-react"

interface LobbyViewProps {
  gameCode: string
  players: Doc<"players">[]
  isHost: boolean
  onStartGame: () => void
  currentUserId: Id<"players"> | null
}

export function LobbyView({ gameCode, players, isHost, onStartGame, currentUserId }: LobbyViewProps) {
  const headerContent = (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Join Code</span>
      <div className="text-6xl font-black tracking-tighter text-primary animate-in zoom-in duration-500">
        {gameCode}
      </div>
    </div>
  )

  const title = (
    <div className="flex items-center justify-center gap-2 text-xl font-normal">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      Waiting for players...
    </div>
  )

  return (
    <GameCard headerContent={headerContent} title={title}>
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
          <Users className="w-4 h-4" />
          {players.length} Players Joined
        </div>
        <div className="grid grid-cols-1 gap-2">
          {players.map((player) => (
            <div
              key={player._id}
              className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border shadow-sm transition-all hover:scale-[1.02]"
            >
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {player.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">{player.name}</span>
                {player.isHost && <span className="text-[10px] uppercase font-bold text-primary tracking-wide">Host</span>}
              </div>
              {player._id === currentUserId && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">You</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <Button
          className="w-full h-12 text-lg font-bold rounded-full shadow-md hover:shadow-lg transition-all"
          size="lg"
          onClick={onStartGame}
        >
          Start Voting Phase
        </Button>
      ) : (
        <div className="text-center p-4 rounded-xl bg-secondary/50 text-muted-foreground text-sm animate-pulse">
          Waiting for host to start...
        </div>
      )}
    </GameCard>
  )
}
