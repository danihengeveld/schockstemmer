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
      console.error("createGame: rejected, unauthorized", { subject: identity?.subject })
      throw new Error("Unauthorized")
    }
    console.debug("createGame: identity resolved", { hostClerkId: identity.subject })

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

    console.info("createGame: game created", { gameId, code, hostPlayerId: playerId })

    return { gameId, playerId }
  },
})

export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    guestName: v.string(),
  },
  handler: async (ctx, { gameId, guestName }) => {
    console.debug("joinGame: request received", { gameId, guestName })

    // ── Input validation ──────────────────────────────────────────────
    const trimmed = guestName.trim()
    if (trimmed.length === 0) {
      console.warn("joinGame: rejected, empty name", { gameId })
      return { success: false as const, error: "Name cannot be empty" }
    }
    if (trimmed.length > 50) {
      console.warn("joinGame: rejected, name too long", { gameId })
      return { success: false as const, error: "Name must be 50 characters or less" }
    }

    const game = await ctx.db.get(gameId)

    if (!game) {
      console.warn("joinGame: rejected, game not found", { gameId })
      return { success: false as const, error: "Game not found" }
    }

    if (game.status !== "lobby") {
      console.warn("joinGame: rejected, game already started", { gameId, status: game.status })
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
          console.warn("joinGame: rejected, already joined", { gameId, playerId: existingAuth._id })
          return { success: false as const, error: "You already joined this game" }
        }
        // Reactivate their own record — identity is verified by Clerk JWT
        await ctx.db.patch(existingAuth._id, { hasLeft: false })
        console.info("joinGame: authenticated player reactivated", { gameId, playerId: existingAuth._id })
        return { success: true as const, playerId: existingAuth._id }
      }
    }

    // ── Check for duplicate name ──────────────────────────────────────
    const existing = await ctx.db
      .query("players")
      .withIndex("by_game_and_name", (q) =>
        q.eq("gameId", gameId).eq("name", trimmed),
      )
      .first()

    if (existing && !existing.hasLeft) {
      console.warn("joinGame: rejected, name already taken", { gameId, name: trimmed })
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

    console.info("joinGame: player joined", { gameId, playerId, guest: !identity?.subject })

    return { success: true as const, playerId }
  },
})

export const leaveGame = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, { playerId }) => {
    const player = await verifyPlayerIdentity(ctx, playerId)
    console.debug("leaveGame: request received", { playerId, gameId: player.gameId, isHost: player.isHost })

    // Idempotent: double-leave (e.g. from network retry) is a no-op
    if (player.hasLeft) {
      console.debug("leaveGame: no-op, player already left", { playerId })
      return
    }

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
        console.info("leaveGame: host handed off", { gameId, previousHost: playerId, newHost: newHost._id })
      } else {
        await ctx.db.patch(gameId, {
          status: "finished",
          finishedAt: Date.now(),
        })
        console.info("leaveGame: game finished, no active players remain", { gameId })
      }
    }

    await ctx.db.patch(playerId, { hasLeft: true, isHost: false })
    console.info("leaveGame: player left", { gameId, playerId })
  },
})

export const startGame = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    await verifyHostAuthorization(ctx, playerId, gameId)
    console.debug("startGame: host authorized", { gameId, playerId })

    const game = await ctx.db.get(gameId)
    if (!game || game.status !== "lobby") {
      console.error("startGame: rejected, game not in lobby", { gameId, status: game?.status })
      throw new Error("Game is not in lobby")
    }

    await ctx.db.patch(gameId, { status: "active" })

    const roundId = await ctx.db.insert("rounds", {
      gameId,
      roundNumber: 1,
      status: "voting",
    })

    console.info("startGame: game started", { gameId, roundId })
  },
})

export const finishGame = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    await verifyHostAuthorization(ctx, playerId, gameId)
    console.debug("finishGame: host authorized", { gameId, playerId })

    const game = await ctx.db.get(gameId)
    if (!game || game.status === "finished") {
      console.error("finishGame: rejected, already finished or not found", { gameId })
      throw new Error("Game is already finished or not found")
    }

    await ctx.db.patch(gameId, {
      status: "finished",
      finishedAt: Date.now(),
    })

    console.info("finishGame: game finished manually", { gameId })
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
    if (!round) {
      console.error("finishRound: rejected, round not found", { roundId })
      throw new Error("Round not found")
    }
    if (round.status !== "pending") {
      console.error("finishRound: rejected, round not pending", { roundId, status: round.status })
      throw new Error("Round is not in pending phase")
    }

    await verifyHostAuthorization(ctx, playerId, round.gameId)
    console.debug("finishRound: host authorized", { roundId, playerId, loserId })

    // Verify the loser belongs to this game and is active
    const loser = await ctx.db.get(loserId)
    if (!loser || loser.gameId !== round.gameId || loser.hasLeft) {
      console.error("finishRound: rejected, invalid loser selection", { roundId, loserId })
      throw new Error("Invalid loser selection")
    }

    await ctx.db.patch(roundId, {
      status: "finished",
      loserId,
      finishedAt: Date.now(),
    })

    console.info("finishRound: round finished", { roundId, gameId: round.gameId, loserId })
  },
})

export const startNextRound = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    await verifyHostAuthorization(ctx, playerId, gameId)
    console.debug("startNextRound: host authorized", { gameId, playerId })

    const game = await ctx.db.get(gameId)
    if (!game || game.status !== "active") {
      console.error("startNextRound: rejected, game not active", { gameId, status: game?.status })
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

    const roundId = await ctx.db.insert("rounds", {
      gameId,
      roundNumber: maxRound + 1,
      status: "voting",
    })

    console.info("startNextRound: round started", { gameId, roundId, roundNumber: maxRound + 1 })
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
    console.debug("submitVote: voter verified", { roundId, voterId, votedForId })

    const round = await ctx.db.get(roundId)
    if (!round) {
      console.error("submitVote: rejected, round not found", { roundId })
      throw new Error("Round not found")
    }
    if (round.status !== "voting") {
      console.error("submitVote: rejected, round not in voting phase", { roundId, status: round.status })
      throw new Error("Round is not in voting phase")
    }
    if (round.gameId !== voter.gameId) {
      console.error("submitVote: rejected, voter not in this game", { roundId, voterId, gameId: round.gameId })
      throw new Error("Player is not in this game")
    }

    // Verify votedFor player belongs to the same game and is active
    const votedFor = await ctx.db.get(votedForId)
    if (!votedFor || votedFor.gameId !== round.gameId || votedFor.hasLeft) {
      console.error("submitVote: rejected, invalid vote target", { roundId, votedForId })
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
      console.info("submitVote: vote updated", { roundId, voterId, votedForId })
    } else {
      await ctx.db.insert("votes", { roundId, voterId, votedForId })
      console.info("submitVote: vote recorded", { roundId, voterId, votedForId })
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

    console.debug("submitVote: vote tally", { roundId, votes: voteCount.length, activePlayers: activePlayers.length })

    if (voteCount.length >= activePlayers.length) {
      await ctx.db.patch(roundId, { status: "pending" })
      console.info("submitVote: round advanced to pending", { roundId, gameId: round.gameId })
    }
  },
})

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getGameByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    // Validate format before hitting the database — reject obviously invalid codes
    if (!GAME_CODE_REGEX.test(code)) {
      console.warn("getGameByCode: rejected, invalid code format", { code })
      return null
    }

    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first()

    console.debug("getGameByCode: lookup complete", { code, found: !!game })

    return game
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
    if (!game) {
      console.warn("getGame: rejected, game not found", { gameId })
      return null
    }

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

    console.debug("getGame: fetched", {
      gameId,
      status: game.status,
      players: players.length,
      rounds: rounds.length,
      activeRoundId: activeRound?._id,
    })

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
    if (!game) {
      console.warn("getGameHistory: rejected, game not found", { gameId })
      return null
    }

    const identity = await ctx.auth.getUserIdentity()

    // For finished games, require the caller to be an authenticated participant
    if (game.status === "finished") {
      if (!identity?.subject) {
        console.warn("getGameHistory: rejected, unauthenticated access to finished game", { gameId })
        return null
      }
      const participant = await ctx.db
        .query("players")
        .withIndex("by_game_and_clerk", (q) =>
          q.eq("gameId", gameId).eq("clerkId", identity.subject),
        )
        .first()
      if (!participant) {
        console.warn("getGameHistory: rejected, non-participant access to finished game", {
          gameId,
          clerkId: identity.subject,
        })
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

    console.debug("getGameHistory: fetched", {
      gameId,
      players: players.length,
      rounds: rounds.length,
      votes: allVotes.length,
    })

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
      console.error("getUserGames: rejected, not authenticated")
      throw new Error("Not authenticated")
    }

    const playerRecords = await ctx.db
      .query("players")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .collect()

    if (playerRecords.length === 0) {
      console.debug("getUserGames: no games found", { clerkId: identity.subject })
      return []
    }

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

    const sorted = games
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .sort(
        (a, b) =>
          (b.finishedAt ?? b._creationTime) -
          (a.finishedAt ?? a._creationTime),
      )

    console.debug("getUserGames: fetched", { clerkId: identity.subject, games: sorted.length })

    return sorted
  },
})
