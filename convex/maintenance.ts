import { internalMutation } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"

const GAME_EXPIRY_MS = 24 * 60 * 60 * 1000

/**
 * Delete a game and everything under it (players, rounds, votes).
 * Only ever called for games with zero rounds, but votes/rounds are still
 * cleaned up defensively in case that invariant changes.
 */
async function deleteGameCascade(ctx: MutationCtx, gameId: Id<"games">) {
  const [players, rounds] = await Promise.all([
    ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect(),
    ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect(),
  ])

  let deletedVotes = 0
  for (const round of rounds) {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect()
    for (const vote of votes) {
      await ctx.db.delete(vote._id)
      deletedVotes++
    }
    await ctx.db.delete(round._id)
  }

  for (const player of players) {
    await ctx.db.delete(player._id)
  }

  await ctx.db.delete(gameId)

  console.debug("deleteGameCascade: cascade deleted", {
    gameId,
    players: players.length,
    rounds: rounds.length,
    votes: deletedVotes,
  })
}

/**
 * Cron target: sweep games older than 24h that the host never finished.
 *
 * - Never started (no rounds played) => the game is treated as if it never
 *   happened, so all of its data is deleted.
 * - Started but never wrapped up (at least 1 round played) => force-finish
 *   it so it stops showing as active and shows up in history instead.
 *
 * Games already "finished" (manually or by a previous sweep) are untouched.
 */
export const expireStaleGames = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - GAME_EXPIRY_MS
    console.info("expireStaleGames: sweep started", { cutoff })

    const [lobbyGames, activeGames] = await Promise.all([
      ctx.db
        .query("games")
        .withIndex("by_status", (q) => q.eq("status", "lobby"))
        .collect(),
      ctx.db
        .query("games")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect(),
    ])

    const staleGames = [...lobbyGames, ...activeGames].filter(
      (game) => game._creationTime <= cutoff,
    )

    console.debug("expireStaleGames: candidates found", {
      lobby: lobbyGames.length,
      active: activeGames.length,
      stale: staleGames.length,
    })

    let deletedCount = 0
    let finishedCount = 0

    for (const game of staleGames) {
      const rounds = await ctx.db
        .query("rounds")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect()

      if (rounds.length === 0) {
        await deleteGameCascade(ctx, game._id)
        deletedCount++
        console.info("expireStaleGames: deleted game with no rounds played", { gameId: game._id })
      } else {
        await ctx.db.patch(game._id, {
          status: "finished",
          finishedAt: Date.now(),
        })
        finishedCount++
        console.info("expireStaleGames: force-finished stale game", { gameId: game._id, rounds: rounds.length })
      }
    }

    console.info("expireStaleGames: sweep complete", {
      examined: staleGames.length,
      deleted: deletedCount,
      finished: finishedCount,
    })
  },
})
