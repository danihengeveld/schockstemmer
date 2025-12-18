import { Skeleton } from "@/components/ui/skeleton"
import { GameCard } from "@/components/game/game-card"

export default function GameLoading() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center">
      <GameCard>
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
          <div className="grid gap-2 pt-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </GameCard>
    </main>
  );
}
