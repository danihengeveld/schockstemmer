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
import { Field, FieldLabel, FieldError } from "@/components/ui/field" // Import primitives
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { User } from "lucide-react"

interface JoinGameProps {
  gameCode?: string
  onJoin: (name: string) => Promise<void>
}

export function JoinGameDialog({ gameCode, onJoin }: JoinGameProps) {
  const [name, setName] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const { user, isSignedIn } = useUser()

  useEffect(() => {
    if (isSignedIn && user) {
      setName(user.firstName || "")
    }
  }, [isSignedIn, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    try {
      setIsJoining(true)
      await onJoin(name)
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
          <Field>
            <FieldLabel>Display Name</FieldLabel>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                name="name" // Accessibility
                placeholder="Your Name"
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isJoining}
              />
            </div>
            {!name && isJoining && <FieldError>Name is required</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={!name || isJoining} className="rounded-full shadow-md transition-all px-8">
              {isJoining ? "Joining..." : "Join Game"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
