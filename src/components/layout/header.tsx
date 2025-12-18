"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

export function Header() {
  const { isSignedIn, user } = useUser()
  const pathname = usePathname()
  const isGamePage = pathname.startsWith('/game/')

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
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src="/icon.png" alt="SchockStemmer Logo" width={180} height={180} className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 shadow-sm" />
          <span className="font-bold text-2xl tracking-tighter">SchockStemmer</span>
        </Link>
        <div className="flex gap-4 items-center">
          {isGamePage && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2 border-primary/20 hover:border-primary/50"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
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
