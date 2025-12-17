"use client"

import { Button } from "@/components/ui/button"
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"

export function Header() {
  const { isSignedIn, user } = useUser()

  return (
    <header className="p-4 flex justify-between items-center max-w-7xl mx-auto w-full border-b mb-4">
      <Link href="/" className="flex items-center gap-2 font-bold text-2xl hover:opacity-80 transition-opacity">
        🍺 SchockStemmer
      </Link>
      <div className="flex gap-4 items-center">
        {!isSignedIn && (
          <SignInButton mode="modal">
            <Button variant="ghost">Login</Button>
          </SignInButton>
        )}
        {isSignedIn && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
              {user?.firstName || user?.fullName}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
        <ModeToggle />
      </div>
    </header>
  )
}
