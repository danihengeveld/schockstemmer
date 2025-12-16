"use client"

import { use } from "react"

interface GamePageProps {
  params: Promise<{ gameId: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const { gameId } = use(params)

  return (
    <h1>Welcome to the static Game Page for Game ID: {gameId}</h1>
  )
}