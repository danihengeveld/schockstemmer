
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
    <div className="w-full max-w-md space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className={cn(
        "rounded-xl border border-border shadow-sm bg-card/50 backdrop-blur-md overflow-hidden relative",
        className
      )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50 animate-pulse" />
        {(title || headerContent) && (
          <CardHeader className="text-center pb-2 px-6 relative z-10">
            {headerContent}
            {title && <CardTitle className="text-2xl font-black tracking-tight mt-2">{title}</CardTitle>}
          </CardHeader>
        )}
        <CardContent className="flex flex-col gap-4 sm:gap-6 px-6 relative z-10">
          {children}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground opacity-50 font-mono tracking-widest uppercase">
        Don't spill your drink
      </div>
    </div>
  )
}
