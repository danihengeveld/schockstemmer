import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyHostAuthorization } from "./lib/auth"
import { calculatePlayerShots, generateGameCode } from "./lib/helpers"

// ─── Mutations ───────────────────────────────────────────────────────────────

export const createGame = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || !identity.givenName) {
      throw new Error("Unauthorized")
    }

    const code = generateGameCode()

    const gameId = await ctx.db.insert("games", {
      hostClerkId: identity.subject,
      code,
      status: "lobby",
    })

    const playerId = await ctx.db.insert("players", {
      gameId,
      clerkId: identity.subject,
      name: identity.givenName,
      isHost: true,
    })

    return { gameId, playerId }
  },
})

export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    guestName: v.string(),
  },
  handler: async (ctx, { gameId, guestName }) => {
    const game = await ctx.db.get(gameId)

    if (!game) {
      return { success: false as const, error: "Game not found" }
    }

    if (game.status !== "lobby") {
      return { success: false as const, error: "Game already started" }
    }

    // Check for duplicate name
    const existing = await ctx.db
      .query("players")
      .withIndex("by_game_and_name", (q) =>
        q.eq("gameId", gameId).eq("name", guestName),
      )
      .first()

    if (existing) {
      if (!existing.hasLeft) {
        return { success: false as const, error: "Name already taken" }
      }

      // Reactivate existing player who left
      const identity = await ctx.auth.getUserIdentity()
      await ctx.db.patch(existing._id, {
        hasLeft: false,
        clerkId: identity?.subject || existing.clerkId,
      })

      return { success: true as const, playerId: existing._id }
    }

    // Create new player
    const identity = await ctx.auth.getUserIdentity()
    const playerId = await ctx.db.insert("players", {
      gameId,
      name: guestName,
      isHost: false,
      clerkId: identity?.subject,
    })

    return { success: true as const, playerId }
  },
})

export const leaveGame = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId)
    if (!player) return

    const { gameId } = player

    if (player.isHost) {
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .filter((q) => q.neq(q.field("hasLeft"), true))
        .collect()

      const newHost = activePlayers.find((p) => p._id !== playerId)

      if (newHost) {
        await ctx.db.patch(newHost._id, { isHost: true })
        if (newHost.clerkId) {
          await ctx.db.patch(gameId, { hostClerkId: newHost.clerkId })
        }
      } else {
        await ctx.db.patch(gameId, {
          status: "finished",
          finishedAt: Date.now(),
        })
      }
    }

    await ctx.db.patch(playerId, { hasLeft: true, isHost: false })
  },
})

export const startGame = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    await verifyHostAuthorization(ctx, playerId, gameId)

    await ctx.db.patch(gameId, { status: "active" })

    await ctx.db.insert("rounds", {
      gameId,
      roundNumber: 1,
      status: "voting",
    })
  },
})

export const finishGame = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    await verifyHostAuthorization(ctx, playerId, gameId)

    await ctx.db.patch(gameId, {
      status: "finished",
      finishedAt: Date.now(),
    })
  },
})

export const finishRound = mutation({
  args: {
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    loserId: v.id("players"),
  },
  handler: async (ctx, { roundId, playerId, loserId }) => {
    const round = await ctx.db.get(roundId)
    if (!round) throw new Error("Round not found")

    await verifyHostAuthorization(ctx, playerId, round.gameId)

    await ctx.db.patch(roundId, {
      status: "finished",
      loserId,
      finishedAt: Date.now(),
    })
  },
})

export const startNextRound = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    await verifyHostAuthorization(ctx, playerId, gameId)

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect()

    const maxRound = rounds.reduce(
      (max, r) => (r.roundNumber > max ? r.roundNumber : max),
      0,
    )

    await ctx.db.insert("rounds", {
      gameId,
      roundNumber: maxRound + 1,
      status: "voting",
    })
  },
})

export const submitVote = mutation({
  args: {
    roundId: v.id("rounds"),
    voterId: v.id("players"),
    votedForId: v.id("players"),
  },
  handler: async (ctx, { roundId, voterId, votedForId }) => {
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_round_and_voter", (q) =>
        q.eq("roundId", roundId).eq("voterId", voterId),
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { votedForId })
    } else {
      await ctx.db.insert("votes", { roundId, voterId, votedForId })
    }

    // Auto-advance to pending when all active players have voted
    const round = await ctx.db.get(roundId)
    if (!round) throw new Error("Round not found")

    const activePlayers = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", round.gameId))
      .filter((q) => q.neq(q.field("hasLeft"), true))
      .collect()

    const voteCount = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", roundId))
      .collect()

    if (voteCount.length >= activePlayers.length) {
      await ctx.db.patch(roundId, { status: "pending" })
    }
  },
})

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getGameByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first()
  },
})

/**
 * Lightweight query for the active game page. Returns the game, players,
 * the current active round, and only the votes for that round.
 */
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId)
    if (!game) return null

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect()

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect()

    // The active round is the first non-finished, or the latest finished
    const activeRound =
      rounds.find((r) => r.status !== "finished") ??
      rounds.sort((a, b) => b.roundNumber - a.roundNumber)[0] ??
      null

    const currentVotes = activeRound
      ? await ctx.db
          .query("votes")
          .withIndex("by_round", (q) => q.eq("roundId", activeRound._id))
          .collect()
      : []

    return {
      game,
      players,
      rounds,
      activeRound,
      currentVotes,
    }
  },
})

/**
 * Full game details including all votes across all rounds.
 * Used for the history detail page and the in-game round history panel.
 */
export const getGameHistory = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId)
    if (!game) return null

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect()

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect()

    // Fetch votes per round using the index (avoids large filter-OR)
    const allVotes = (
      await Promise.all(
        rounds.map((r) =>
          ctx.db
            .query("votes")
            .withIndex("by_round", (q) => q.eq("roundId", r._id))
            .collect(),
        ),
      )
    ).flat()

    return { game, players, rounds, allVotes }
  },
})

/**
 * List of games the current user has participated in.
 * Returns summary data only — no per-round vote details.
 */
export const getUserGames = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) {
      throw new Error("Not authenticated")
    }

    const playerRecords = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("clerkId"), identity.subject))
      .collect()

    if (playerRecords.length === 0) return []

    const gameIds = [...new Set(playerRecords.map((p) => p.gameId))]

    const games = await Promise.all(
      gameIds.map(async (id) => {
        const game = await ctx.db.get(id)
        if (!game) return null

        const players = await ctx.db
          .query("players")
          .withIndex("by_game", (q) => q.eq("gameId", id))
          .collect()

        const rounds = await ctx.db
          .query("rounds")
          .withIndex("by_game", (q) => q.eq("gameId", id))
          .collect()

        const finishedRounds = rounds.filter((r) => r.status === "finished")

        // Fetch votes per round (indexed, avoids large filter-OR)
        const allVotes =
          rounds.length > 0
            ? (
                await Promise.all(
                  rounds.map((r) =>
                    ctx.db
                      .query("votes")
                      .withIndex("by_round", (q) => q.eq("roundId", r._id))
                      .collect(),
                  ),
                )
              ).flat()
            : []

        // Find the worst player
        const playerStats = players
          .map((player) => ({
            name: player.name,
            totalShots: calculatePlayerShots(player, finishedRounds, allVotes),
          }))
          .sort((a, b) => b.totalShots - a.totalShots)

        const worstPlayer =
          playerStats.length > 0 &&
          finishedRounds.length > 0 &&
          playerStats[0].totalShots > 0
            ? playerStats[0]
            : null

        // Find the last round's loser name
        const latestRound = rounds.sort(
          (a, b) => b.roundNumber - a.roundNumber,
        )[0]
        let loserName: string | null = null
        if (latestRound?.loserId) {
          const loser = await ctx.db.get(latestRound.loserId)
          loserName = loser?.name ?? null
        }

        return {
          _id: game._id,
          _creationTime: game._creationTime,
          code: game.code,
          status: game.status,
          finishedAt: game.finishedAt,
          playerCount: players.length,
          loserName,
          totalRounds: finishedRounds.length,
          worstPlayerName: worstPlayer?.name ?? null,
          worstPlayerShots: worstPlayer?.totalShots ?? 0,
        }
      }),
    )

    return games
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .sort(
        (a, b) =>
          (b.finishedAt ?? b._creationTime) -
          (a.finishedAt ?? a._creationTime),
      )
  },
})
