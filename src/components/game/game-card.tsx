
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface GameCardProps {
  children: React.ReactNode
  title?: React.ReactNode
  className?: string
  headerContent?: React.ReactNode
}

export function GameCard({ children, title, className, headerContent }: GameCardProps) {
  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className={cn(
        "border-0 shadow-2xl bg-linear-to-br from-card to-accent/5 overflow-hidden",
        className
      )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
        {(title || headerContent) && (
          <CardHeader className="text-center pb-2 relative z-10">
            {headerContent}
            {title && <CardTitle className="text-2xl font-black tracking-tight mt-4">{title}</CardTitle>}
          </CardHeader>
        )}
        <CardContent className="flex flex-col gap-6 relative z-10">
          {children}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground opacity-50 font-mono tracking-widest uppercase">
        Don't spill your drink
      </div>
    </div>
  )
}
