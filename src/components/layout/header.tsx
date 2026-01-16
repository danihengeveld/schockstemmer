"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { HugeiconsIcon } from "@hugeicons/react"
import { Share08Icon } from "@hugeicons/core-free-icons"
import logo from "../../app/icon.png"

export function Header() {
  const { isSignedIn, user } = useUser()
  const params = useParams()

  const gameId = params?.gameId as Id<"games"> | undefined
  const game = useQuery(api.games.getGameWithDetails, gameId ? { gameId } : "skip")?.game

  const showInvite = !!gameId && game?.status !== "finished"

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my SchockStemmer game!",
          url
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success("Invite link copied!")
      }
    } catch (err) {
      // Ignore abort errors
    }
  }

  return (
    <header className="w-full border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center w-full">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity whitespace-nowrap overflow-hidden">
          <Image src={logo} alt="SchockStemmer Logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 shadow-sm shrink-0" />
          <span className="font-bold text-xl sm:text-2xl tracking-tighter hidden sm:block">SchockStemmer</span>
        </Link>
        <div className="flex gap-2 sm:gap-4 items-center shrink-0">
          {showInvite && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2 border-primary/20 hover:border-primary/50 h-8 sm:h-9"
                onClick={handleShare}
              >
                <HugeiconsIcon icon={Share08Icon} strokeWidth={2} className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            </div>
          )}
          {isSignedIn && (
            <Link href="/history">
              <Button variant="ghost" className="rounded-full">History</Button>
            </Link>
          )}
          {!isSignedIn && (
            <SignInButton mode="modal">
              <Button variant="ghost" className="rounded-full">Login</Button>
            </SignInButton>
          )}
          {isSignedIn && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                {user?.firstName}
              </span>
              <UserButton />
            </div>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
