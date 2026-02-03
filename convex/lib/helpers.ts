import type { Doc } from "../_generated/dataModel"

/**
 * Calculate total shots for a player across all finished rounds.
 * Rules: Loser drinks 1-2 shots, voters who picked loser drink 1.
 */
export function calculatePlayerShots(
  player: Doc<"players">,
  finishedRounds: Doc<"rounds">[],
  allVotes: Doc<"votes">[]
): number {
  let totalShots = 0;
  
  finishedRounds.forEach(round => {
    if (!round.loserId) return;

    const roundVotes = allVotes.filter(v => v.roundId === round._id);
    const isLoser = round.loserId === player._id;
    const playerVote = roundVotes.find(v => v.voterId === player._id);
    const votedForLoser = playerVote?.votedForId === round.loserId;

    if (isLoser) {
      // Loser drinks 1, or 2 if they voted for themselves
      const selfVoted = playerVote?.votedForId === player._id;
      totalShots += selfVoted ? 2 : 1;
    } else if (votedForLoser) {
      // Safe players who voted for the loser drink 1
      totalShots += 1;
    }
  });
  
  return totalShots;
}

/**
 * Generate a random 6-character game code.
 */
export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
