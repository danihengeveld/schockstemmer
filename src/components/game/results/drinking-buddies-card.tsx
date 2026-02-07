import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Doc } from "../../../../convex/_generated/dataModel"
import { HugeiconsIcon } from "@hugeicons/react"
import { DrinkIcon } from "@hugeicons/core-free-icons"
import { useTranslations } from "next-intl"

interface DrinkingBuddiesCardProps {
  drinkingBuddies: Doc<"players">[]
  loser: Doc<"players"> | undefined
}

export function DrinkingBuddiesCard({ drinkingBuddies, loser }: DrinkingBuddiesCardProps) {
  const t = useTranslations("DrinkingBuddies")

  if (drinkingBuddies.length === 0) return null

  return (
    <Card className="rounded-xl bg-accent/30 border border-border/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <HugeiconsIcon icon={DrinkIcon} strokeWidth={2} className="w-5 h-5 text-amber-500" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description", { name: loser?.name ?? "" })}
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
  )
}
