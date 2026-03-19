import type { Doc, Id } from "../_generated/dataModel"

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

// ─── Round-result derivation ──────────────────────────────────────────────────

export interface RoundResult {
  loser: Doc<"players"> | undefined
  loserVotedForSelf: boolean
  loserShots: number
  drinkingBuddies: Doc<"players">[]
}

/**
 * Derive the result summary for a single round: who lost, how many shots,
 * and which players are "drinking buddies" (voted for the loser).
 *
 * Used by results-view, round-history, voting-breakdown, and history detail.
 */
export function deriveRoundResult(
  loserId: Id<"players">,
  players: Doc<"players">[],
  votes: Doc<"votes">[],
): RoundResult {
  const loser = players.find(p => p._id === loserId)
  const loserVote = votes.find(v => v.voterId === loserId)
  const loserVotedForSelf = loserVote?.votedForId === loserId
  const loserShots = loserVotedForSelf ? 2 : 1

  const drinkingBuddies = votes
    .filter(v => v.votedForId === loserId && v.voterId !== loserId)
    .map(v => players.find(p => p._id === v.voterId))
    .filter((p): p is Doc<"players"> => !!p)

  return { loser, loserVotedForSelf, loserShots, drinkingBuddies }
}

// ─── Game code ────────────────────────────────────────────────────────────────

/** Characters used in game codes (no ambiguous 0/O, 1/I/L). */
const GAME_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const GAME_CODE_LENGTH = 6

/** Regex that matches a valid game code. Used for input validation. */
export const GAME_CODE_REGEX = new RegExp(
  `^[${GAME_CODE_CHARS}]{${GAME_CODE_LENGTH}}$`,
)

/**
 * Generate a random 6-character game code.
 */
export function generateGameCode(): string {
  let code = ""
  for (let i = 0; i < GAME_CODE_LENGTH; i++) {
    code += GAME_CODE_CHARS.charAt(Math.floor(Math.random() * GAME_CODE_CHARS.length))
  }
  return code
}
