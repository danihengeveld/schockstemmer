"use client"

import { api } from "../../../convex/_generated/api";
import { useMutation } from "convex/react";

export default function CreateGameButton() {
  const createGame = useMutation(api.games.createGame)

  const handleCreateGame = () => {
    createGame({}).then((result) => {
      console.log("Created game with ID:", result.gameId)
    })
  }

  return (
    <button onClick={handleCreateGame}>
      Create Game
    </button>
  );
}
