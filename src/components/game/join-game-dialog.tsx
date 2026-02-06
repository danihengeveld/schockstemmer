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
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon } from "@hugeicons/core-free-icons"
import { useTranslations } from "next-intl"

interface JoinGameProps {
  gameCode?: string
  onJoin: (name: string) => Promise<void>
}

export function JoinGameDialog({ gameCode, onJoin }: JoinGameProps) {
  const t = useTranslations("JoinGame")
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
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {gameCode ? t("descriptionWithCode", { code: gameCode }) : t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel>{t("displayName")}</FieldLabel>
            <div className="relative">
              <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                name="name" // Accessibility
                placeholder={t("placeholder")}
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isJoining}
              />
            </div>
            {!name && isJoining && <FieldError>{t("nameRequired")}</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={!name || isJoining} className="rounded-full shadow-md transition-all px-8">
              {isJoining ? t("joining") : t("joinGame")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
