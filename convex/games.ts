import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Create a new game
export const createGame = mutation({
  args: {},
  handler: async (ctx, _) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null || !identity.subject || !identity.email || !identity.givenName) {
      throw new Error("Not authenticated or missing user information");
    }

    // Generate unique code
    let code = generateGameCode()
    let existing = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique()

    while (existing) {
      code = generateGameCode()
      existing = await ctx.db
        .query("games")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()
    }

    // Create game
    const gameId = await ctx.db.insert("games", {
      hostClerkId: identity.subject,
      code,
      status: "lobby",
    })

    // Add host as first player
    const playerId = await ctx.db.insert("players", {
      gameId,
      name: identity.givenName,
      email: identity.email,
      clerkId: identity.subject,
      isHost: true,
    })

    return { gameId, playerId, code }
  },
})

// Get game by code
export const getGameByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique()
  },
})

// Get game with all players and votes (real-time subscription)
export const getGameWithDetails = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) return null

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()

    return { game, players, votes }
  },
})

// Join a game
export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    guestName: v.string(),
    guestEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: true; playerId: string; } | { success: false; error: string }> => {
    const game = await ctx.db.get(args.gameId)

    if (!game) {
      throw new Error("Game not found")
    }

    if (game.status !== "lobby") {
      return { success: false, error: "Game has already started" }
    }

    // Check if guest already joined
    const existing = await ctx.db
      .query("players")
      .withIndex("by_game_and_name", (q) => q.eq("gameId", args.gameId).eq("name", args.guestName))
      .unique()

    if (existing) {
      // Return error for duplicate name
      return { success: false, error: "Name already taken in this game" }
    }

    const playerId = await ctx.db.insert("players", {
      gameId: args.gameId,
      name: args.guestName,
      email: args.guestEmail,
      isHost: false,
    })

    return { success: true, playerId }
  },
})

// Submit a vote
export const submitVote = mutation({
  args: {
    gameId: v.id("games"),
    voterId: v.id("players"),
    votedForId: v.id("players")
  },
  handler: async (ctx, args) => {
    // Check if already voted
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_game_and_voter", (q) => q.eq("gameId", args.gameId).eq("voterId", args.voterId))
      .unique()

    if (existing) {
      // Update existing vote
      await ctx.db.patch(existing._id, { votedForId: args.votedForId })
    } else {
      await ctx.db.insert("votes", {
        gameId: args.gameId,
        voterId: args.voterId,
        votedForId: args.votedForId,
      })
    }
  },
})

// Finish game with loser
export const finishGame = mutation({
  args: {
    gameId: v.id("games"),
    loserId: v.id("players"),
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
      throw new Error("Only the host can finish the game")
    }

    await ctx.db.patch(args.gameId, {
      status: "finished",
      loserId: args.loserId,
      finishedAt: Date.now(),
    })
  },
})

// Leave game (remove player)
export const leaveGame = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return

    // Delete any votes by this player
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_game_and_voter", (q) => q.eq("gameId", player.gameId).eq("voterId", args.playerId))
      .unique()

    if (vote) {
      await ctx.db.delete(vote._id)
    }

    // Delete votes for this player
    const votesFor = await ctx.db
      .query("votes")
      .withIndex("by_game_and_voted_for", (q) => q.eq("gameId", player.gameId).eq("votedForId", args.playerId))
      .collect()

    for (const vote of votesFor) {
      await ctx.db.delete(vote._id)
    }

    // Delete the player
    await ctx.db.delete(args.playerId)
  },
})
