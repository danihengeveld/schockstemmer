import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Doc } from "./_generated/dataModel"

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
export const getUserGames = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    let playerRecords: Doc<"players">[] = [];
    if (identity) {
      playerRecords = await ctx.db.query("players").filter(q => q.eq(q.field("clerkId"), identity.subject)).collect();
    } else if (args.email) {
      playerRecords = await ctx.db.query("players").filter(q => q.eq(q.field("email"), args.email)).collect();
    }

    if (playerRecords.length === 0) return [];

    // Fetch unique games
    const gameIds = [...new Set(playerRecords.map(p => p.gameId))];

    const games: Doc<"games">[] = [];
    for (const id of gameIds) {
      const game = await ctx.db.get(id);
      if (game) games.push(game);
    }

    return games.sort((a, b) => (b.finishedAt || b._creationTime) - (a.finishedAt || a._creationTime));
  }
})

export const createGame = mutation({
  args: {},
  handler: async (ctx, _) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Unauthorized")

    // Generate short code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const gameId = await ctx.db.insert("games", {
      hostClerkId: identity.subject,
      code,
      status: "lobby",
    })

    // Add host as player
    await ctx.db.insert("players", {
      gameId,
      clerkId: identity.subject,
      name: identity.name || "Host",
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

    const votes = await ctx.db
      .query("votes")
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .collect()

    return { game, players, votes }
  },
})

export const joinGame = mutation({
  args: {
    gameId: v.id("games"),
    guestName: v.string(),
    guestEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: true; playerId: string; } | { success: false; error: string }> => {
    const { gameId, guestName, guestEmail } = args
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
      email: guestEmail, // Store optional email
    })

    return { success: true, playerId }
  },
})

// Start voting
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

    await ctx.db.patch(args.gameId, {
      status: "voting",
    })
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

    // Check if all players have voted
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()

    // If everyone voted (number of votes equals number of players), move to pending
    // Note: This logic assumes we got the latest vote included in the result or we count the just inserted/updated one.
    // convex queries inside mutations see the writes from the same mutation? 
    // Yes, they should see the writes if consistent read is used, but query within mutation is standard.
    // Wait, `votes` query above might NOT see the just inserted vote if not using `db.get` specifically or if consistency is eventual.
    // Actually, in Convex Mutation, reads ARE consistent with writes done in the same mutation.

    if (votes.length >= players.length) {
      await ctx.db.patch(args.gameId, {
        status: "pending",
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
