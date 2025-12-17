"use client"

import { api } from "../../../convex/_generated/api";
import { useMutation } from "convex/react";

export default function CreateGameButton() {
  const createGame = useMutation(api.games.createGame)

  const handleCreateGame = async () => {
    const game = await createGame();
    console.log("Created game:", JSON.stringify(game));
  }

  return (
    <button onClick={handleCreateGame}>
      Create Game
    </button>
  );
}
