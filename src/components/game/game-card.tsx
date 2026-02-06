
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
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className={cn(
        "rounded-xl border border-border shadow-sm bg-card/50 backdrop-blur-md overflow-hidden",
        className
      )}>
        {(title || headerContent) && (
          <CardHeader className="text-center pb-2 px-6">
            {headerContent}
            {title && <CardTitle className="text-2xl font-black tracking-tight mt-2">{title}</CardTitle>}
          </CardHeader>
        )}
        <CardContent className="flex flex-col gap-4 sm:gap-6 px-6">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
