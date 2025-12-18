import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Create a new game
export const getUserGames = query({
  args: {},
  handler: async (ctx, _) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity || !identity.subject) {
      throw new Error("Not authenticated")
    }

    const playerRecords = await ctx.db.query("players").filter(q => q.eq(q.field("clerkId"), identity.subject)).collect();

    if (playerRecords.length === 0) return [];

    // Fetch unique games
    const gameIds = [...new Set(playerRecords.map(p => p.gameId))];

    const games = await Promise.all(gameIds.map(async (id) => {
      const game = await ctx.db.get(id);
      if (!game) return null;

      const players = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("gameId"), id))
        .collect()

      const latestRound = await ctx.db
        .query("rounds")
        .withIndex("by_game", (q) => q.eq("gameId", id))
        .order("desc")
        .first();

      let loserName = null;
      if (latestRound?.loserId) {
        const loser = await ctx.db.get(latestRound.loserId);
        loserName = loser?.name;
      }

      return {
        ...game,
        playerCount: players.length,
        loserName,
        lastRoundNumber: latestRound?.roundNumber || 0
      };
    }));

    return games
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .sort((a, b) => (b.finishedAt || b._creationTime) - (a.finishedAt || a._creationTime));
  }
})

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const createGame = mutation({
  args: {},
  handler: async (ctx, _) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || !identity.subject || !identity.givenName) throw new Error("Unauthorized")

    // Generate short code
    const code = generateGameCode()

    const gameId = await ctx.db.insert("games", {
      hostClerkId: identity.subject,
      code,
      status: "lobby",
    })

    // Add host as player
    await ctx.db.insert("players", {
      gameId,
      clerkId: identity.subject,
      name: identity.givenName,
      isHost: true,
    })

    return { gameId }
  },
})

export const getGameByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("games").withIndex("by_code", q => q.eq("code", args.code)).first();
  }
})

export const getGameWithDetails = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) return null

    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .collect()

    const ALL_rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()

    const allVotes = await ctx.db
      .query("votes")
      .filter((q) => q.or(
        ...ALL_rounds.map(r => q.eq(q.field("roundId"), r._id))
      ))
      .collect()

    const activeRound = ALL_rounds.find(r => r.status !== "finished") || ALL_rounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];

    const currentVotes = activeRound ? allVotes.filter(v => v.roundId === activeRound._id) : [];

    return { game, players, activeRound, votes: currentVotes, allVotes, rounds: ALL_rounds }
  },
})

export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    guestName: v.string()
  },
  handler: async (ctx, args) => {
    const { gameId, guestName } = args
    const game = await ctx.db.get(gameId)
    if (!game) return { success: false, error: "Game not found" }

    if (game.status !== "lobby") return { success: false, error: "Game already started" }

    // Check duplicate name
    const existing = await ctx.db
      .query("players")
      .filter(q => q.and(
        q.eq(q.field("gameId"), gameId),
        q.eq(q.field("name"), guestName)
      ))
      .first()

    if (existing) return { success: false, error: "Name already taken" }

    // Check auth
    const identity = await ctx.auth.getUserIdentity()

    const playerId = await ctx.db.insert("players", {
      gameId,
      name: guestName,
      isHost: false,
      clerkId: identity?.subject, // Link if auth
    })

    return { success: true, playerId }
  },
})

// Start the first round
export const startGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    // Validate host is making this call
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated")
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_game_and_clerk", (q) => q.eq("gameId", args.gameId).eq("clerkId", identity.subject))
      .unique()

    if (!player || !player.isHost) {
      throw new Error("Only the host can start the game")
    }

    // Mark game as active
    await ctx.db.patch(args.gameId, {
      status: "active",
    })

    // Create first round
    await ctx.db.insert("rounds", {
      gameId: args.gameId,
      roundNumber: 1,
      status: "voting",
    })
  },
})

// Start next round
export const startNextRound = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || !identity.subject) throw new Error("Not authenticated")

    const player = await ctx.db
      .query("players")
      .withIndex("by_game_and_clerk", (q) => q.eq("gameId", args.gameId).eq("clerkId", identity.subject))
      .unique()

    if (!player || !player.isHost) throw new Error("Only the host can start the next round")

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()

    const maxRound = rounds.sort((a, b) => b.roundNumber - a.roundNumber)[0]

    await ctx.db.insert("rounds", {
      gameId: args.gameId,
      roundNumber: (maxRound?.roundNumber || 0) + 1,
      status: "voting",
    })
  }
})

// Submit a vote
export const submitVote = mutation({
  args: {
    roundId: v.id("rounds"),
    voterId: v.id("players"),
    votedForId: v.id("players")
  },
  handler: async (ctx, args) => {
    // Check if already voted
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_round_and_voter", (q) => q.eq("roundId", args.roundId).eq("voterId", args.voterId))
      .unique()

    if (existing) {
      // Update existing vote
      await ctx.db.patch(existing._id, { votedForId: args.votedForId })
    } else {
      await ctx.db.insert("votes", {
        roundId: args.roundId,
        voterId: args.voterId,
        votedForId: args.votedForId,
      })
    }

    // Check if all players in the game have voted for this round
    const round = await ctx.db.get(args.roundId)
    if (!round) return

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", round.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect()

    if (votes.length >= players.length) {
      await ctx.db.patch(args.roundId, {
        status: "pending",
      })
    }
  },
})

// Finish round with loser
export const finishRound = mutation({
  args: {
    roundId: v.id("rounds"),
    loserId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId)
    if (!round) throw new Error("Round not found")

    // Validate host
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || !identity.subject) throw new Error("Not authenticated")

    const player = await ctx.db
      .query("players")
      .withIndex("by_game_and_clerk", (q) => q.eq("gameId", round.gameId).eq("clerkId", identity.subject))
      .unique()

    if (!player || !player.isHost) throw new Error("Only the host can finish the round")

    await ctx.db.patch(args.roundId, {
      status: "finished",
      loserId: args.loserId,
      finishedAt: Date.now(),
    })
  },
})

// Finish entire game session
export const finishGame = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || !identity.subject) throw new Error("Not authenticated")

    const player = await ctx.db
      .query("players")
      .withIndex("by_game_and_clerk", (q) => q.eq("gameId", args.gameId).eq("clerkId", identity.subject))
      .unique()

    if (!player || !player.isHost) throw new Error("Only the host can finish the game")

    await ctx.db.patch(args.gameId, {
      status: "finished",
      finishedAt: Date.now(),
    })
  }
})

// Leave game (remove player)
export const leaveGame = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args): Promise<void> => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return

    // Delete any votes by this player (across all rounds if necessary, but mostly active ones)
    // For simplicity, we can find all votes by this player and delete them.
    const votes = await ctx.db
      .query("votes")
      .filter(q => q.eq(q.field("voterId"), args.playerId))
      .collect();

    for (const v of votes) {
      await ctx.db.delete(v._id)
    }

    // Also delete any votes FOR this player
    const votesFor = await ctx.db
      .query("votes")
      .filter(q => q.eq(q.field("votedForId"), args.playerId))
      .collect();

    for (const v of votesFor) {
      await ctx.db.delete(v._id)
    }

    // Delete the player
    await ctx.db.delete(args.playerId)
  },
})
