"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { useUser, SignInButton } from "@clerk/nextjs"

interface JoinGameProps {
  gameCode?: string
  onJoin: (name: string, email?: string) => Promise<void>
}

export function JoinGameDialog({ gameCode, onJoin }: JoinGameProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const { user, isSignedIn } = useUser()

  useEffect(() => {
    if (isSignedIn && user) {
      setName(user.firstName || "")
      setEmail(user.primaryEmailAddress?.emailAddress || "")
    }
  }, [isSignedIn, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    try {
      setIsJoining(true)
      await onJoin(name, email || undefined)
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Game</DialogTitle>
          <DialogDescription>
            Enter your name to join the game{gameCode ? ` (${gameCode})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isJoining}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="To track your history (Optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isJoining || (isSignedIn && !!user?.primaryEmailAddress?.emailAddress)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name || isJoining}>
              {isJoining ? "Joining..." : "Join Game"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
