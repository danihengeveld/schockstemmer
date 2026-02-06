import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Doc } from "../../../../convex/_generated/dataModel"
import { useTranslations } from "next-intl"

interface LoserCardProps {
  loser: Doc<"players"> | undefined
  loserShots: number
  loserVotedForSelf: boolean
}

export function LoserCard({ loser, loserShots, loserVotedForSelf }: LoserCardProps) {
  const t = useTranslations("LoserCard")

  return (
    <Card className="rounded-xl border border-destructive/20 shadow-xl overflow-hidden relative bg-card/50 backdrop-blur-sm transition-all hover:shadow-destructive/5 hover:border-destructive/40">
      <div className="absolute inset-0 bg-destructive/5 pointer-events-none z-0" />
      <CardHeader className="text-center pb-2 relative z-10">
        <CardTitle className="text-xl uppercase tracking-widest text-destructive font-black">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:gap-6 py-6 sm:py-8 relative z-10">
        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-destructive shadow-xl ring-4 ring-destructive/20">
          <AvatarFallback className="bg-destructive text-destructive-foreground text-3xl sm:text-4xl font-black">
            {loser?.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center space-y-1">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">{loser?.name}</h2>
          <div className="flex flex-col items-center gap-1">
            <p className="text-destructive font-bold animate-pulse text-sm uppercase tracking-widest">
              {t("takeShots", { count: loserShots })}
            </p>
            {loserVotedForSelf && (
              <Badge variant="destructive" className="rounded-full text-[10px] uppercase font-black tracking-widest">
                {t("selfVotePenalty")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
