import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { verifyHostAuthorization, verifyPlayerIdentity } from "./lib/auth"
import { calculatePlayerShots, generateGameCode, GAME_CODE_REGEX } from "./lib/helpers"

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
    // ── Input validation ──────────────────────────────────────────────
    const trimmed = guestName.trim()
    if (trimmed.length === 0) {
      return { success: false as const, error: "Name cannot be empty" }
    }
    if (trimmed.length > 50) {
      return { success: false as const, error: "Name must be 50 characters or less" }
    }

    const game = await ctx.db.get(gameId)

    if (!game) {
      return { success: false as const, error: "Game not found" }
    }

    if (game.status !== "lobby") {
      return { success: false as const, error: "Game already started" }
    }

    const identity = await ctx.auth.getUserIdentity()

    // ── Authenticated user: rejoin by Clerk ID, not by name ───────────
    if (identity?.subject) {
      const existingAuth = await ctx.db
        .query("players")
        .withIndex("by_game_and_clerk", (q) =>
          q.eq("gameId", gameId).eq("clerkId", identity.subject),
        )
        .first()

      if (existingAuth) {
        if (!existingAuth.hasLeft) {
          return { success: false as const, error: "You already joined this game" }
        }
        // Reactivate their own record — identity is verified by Clerk JWT
        await ctx.db.patch(existingAuth._id, { hasLeft: false })
        return { success: true as const, playerId: existingAuth._id }
      }
    }

    // ── Check for duplicate name ──────────────────────────────────────
    const existing = await ctx.db
      .query("players")
      .withIndex("by_game_and_name", (q) =>
        q.eq("gameId", gameId).eq("name", trimmed),
      )
      .filter((q) => q.neq("hasLeft", true))
      .first()

    if (existing && !existing.hasLeft) {
      return { success: false as const, error: "Name already taken" }
    }
    // Note: if a name exists with hasLeft=true, we do NOT reactivate it.
    // Guest players cannot prove they are the original owner. A new player
    // record is created instead. This prevents name-based impersonation.
    // Trade-off: a guest who legitimately rejoins loses their voting history
    // (stats stay on the old record). Authenticated users don't have this
    // problem — they rejoin by Clerk ID above.

    // ── Create new player ─────────────────────────────────────────────
    const playerId = await ctx.db.insert("players", {
      gameId,
      name: trimmed,
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
    const player = await verifyPlayerIdentity(ctx, playerId)
    // Idempotent: double-leave (e.g. from network retry) is a no-op
    if (player.hasLeft) return

    const { gameId } = player

    if (player.isHost) {
      // Find next host candidate — exclude the leaving player at query level
      // so they can't be selected as host before their hasLeft flag is set
      // (the DB write happens at the end of this handler)
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .filter((q) =>
          q.and(
            q.neq(q.field("hasLeft"), true),
            q.neq(q.field("_id"), playerId),
          ),
        )
        .collect()

      const newHost = activePlayers[0]

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

    const game = await ctx.db.get(gameId)
    if (!game || game.status !== "lobby") {
      throw new Error("Game is not in lobby")
    }

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

    const game = await ctx.db.get(gameId)
    if (!game || game.status === "finished") {
      throw new Error("Game is already finished or not found")
    }

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
    if (round.status !== "pending") throw new Error("Round is not in pending phase")

    await verifyHostAuthorization(ctx, playerId, round.gameId)

    // Verify the loser belongs to this game and is active
    const loser = await ctx.db.get(loserId)
    if (!loser || loser.gameId !== round.gameId || loser.hasLeft) {
      throw new Error("Invalid loser selection")
    }

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

    const game = await ctx.db.get(gameId)
    if (!game || game.status !== "active") {
      throw new Error("Game is not active")
    }

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
    // Verify the caller is the voter
    const voter = await verifyPlayerIdentity(ctx, voterId)

    const round = await ctx.db.get(roundId)
    if (!round) throw new Error("Round not found")
    if (round.status !== "voting") throw new Error("Round is not in voting phase")
    if (round.gameId !== voter.gameId) throw new Error("Player is not in this game")

    // Verify votedFor player belongs to the same game and is active
    const votedFor = await ctx.db.get(votedForId)
    if (!votedFor || votedFor.gameId !== round.gameId || votedFor.hasLeft) {
      throw new Error("Invalid vote target")
    }

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
    // Validate format before hitting the database — reject obviously invalid codes
    if (!GAME_CODE_REGEX.test(code)) {
      return null
    }

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
 *
 * Authorization: the caller must be either
 *  - an authenticated user who participated in this game, OR
 *  - requesting a game that is NOT finished (active game access for guests)
 *
 * This prevents unauthenticated enumeration of finished game history,
 * while still allowing guest players to see round history during play.
 */
export const getGameHistory = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId)
    if (!game) return null

    const identity = await ctx.auth.getUserIdentity()

    // For finished games, require the caller to be an authenticated participant
    if (game.status === "finished") {
      if (!identity?.subject) {
        return null
      }
      const participant = await ctx.db
        .query("players")
        .withIndex("by_game_and_clerk", (q) =>
          q.eq("gameId", gameId).eq("clerkId", identity.subject),
        )
        .first()
      if (!participant) {
        return null
      }
    }

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
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
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
