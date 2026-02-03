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

      const allRounds = await ctx.db
        .query("rounds")
        .withIndex("by_game", (q) => q.eq("gameId", id))
        .collect();

      const finishedRounds = allRounds.filter(r => r.status === "finished");
      const latestRound = allRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];

      // Get all votes for this game
      const allVotes = allRounds.length > 0 
        ? await ctx.db
            .query("votes")
            .filter((q) => q.or(
              ...allRounds.map(r => q.eq(q.field("roundId"), r._id))
            ))
            .collect()
        : [];

      // Calculate total shots per player across all rounds
      const playerStats = players.map(player => {
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
        return { playerId: player._id, playerName: player.name, totalShots };
      }).sort((a, b) => b.totalShots - a.totalShots);

      // Find the overall worst player (most shots), only if there are players and finished rounds
      const worstPlayer = playerStats.length > 0 && finishedRounds.length > 0 ? playerStats[0] : null;

      let loserName = null;
      if (latestRound?.loserId) {
        const loser = await ctx.db.get(latestRound.loserId);
        loserName = loser?.name;
      }

      return {
        ...game,
        playerCount: players.length,
        loserName,
        lastRoundNumber: latestRound?.roundNumber || 0,
        totalRounds: finishedRounds.length,
        worstPlayerName: worstPlayer?.playerName,
        worstPlayerShots: worstPlayer?.totalShots || 0,
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
    const playerId = await ctx.db.insert("players", {
      gameId,
      clerkId: identity.subject,
      name: identity.givenName,
      isHost: true,
    })

    return { gameId, playerId }
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
      .withIndex("by_game_and_name", (q) => q.eq("gameId", gameId).eq("name", guestName))
      .first()

    if (existing) {
      if (!existing.hasLeft) {
        return { success: false, error: "Name already taken" }
      }

      // Reactivate existing player who left
      const identity = await ctx.auth.getUserIdentity()
      await ctx.db.patch(existing._id, {
        hasLeft: false,
        clerkId: identity?.subject || existing.clerkId, // Update or keep existing clerkId
      })

      return { success: true, playerId: existing._id }
    }

    // Check auth for new player
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
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)

    if (!player || player.gameId !== args.gameId || !player.isHost) {
      throw new Error("Only the host can start the game")
    }

    // Double check auth if they are supposed to be authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (player.clerkId && (!identity || identity.subject !== player.clerkId)) {
      throw new Error("Unauthorized host action")
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
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)

    if (!player || player.gameId !== args.gameId || !player.isHost) {
      throw new Error("Only the host can start the next round")
    }

    // Double check auth if they are supposed to be authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (player.clerkId && (!identity || identity.subject !== player.clerkId)) {
      throw new Error("Unauthorized host action")
    }

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
    if (!round) throw new Error("Round not found")

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", round.gameId))
      .filter((q) => q.neq(q.field("hasLeft"), true)) // Exclude players who have left
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
    playerId: v.id("players"),
    loserId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId)
    if (!round) throw new Error("Round not found")

    const player = await ctx.db.get(args.playerId)
    if (!player || player.gameId !== round.gameId || !player.isHost) {
      throw new Error("Only the host can finish the round")
    }

    // Double check auth if they are supposed to be authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (player.clerkId && (!identity || identity.subject !== player.clerkId)) {
      throw new Error("Unauthorized host action")
    }

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
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)

    if (!player || player.gameId !== args.gameId || !player.isHost) {
      throw new Error("Only the host can finish the game")
    }

    // Double check auth if they are supposed to be authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (player.clerkId && (!identity || identity.subject !== player.clerkId)) {
      throw new Error("Unauthorized host action")
    }

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

    const gameId = player.gameId;

    // If host is leaving, transfer host status
    if (player.isHost) {
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .filter((q) => q.neq(q.field("hasLeft"), true))
        .collect();

      const newHost = activePlayers.find((p) => p._id !== args.playerId);
      if (newHost) {
        await ctx.db.patch(newHost._id, { isHost: true });

        // Update games.hostClerkId if new host is authenticated
        if (newHost.clerkId) {
          await ctx.db.patch(gameId, { hostClerkId: newHost.clerkId });
        }
      } else {
        // No players left, mark game as finished
        await ctx.db.patch(gameId, { status: "finished", finishedAt: Date.now() });
      }
    }

    // Instead of deleting the player or their votes, we mark them as having left
    // This preserves historical data while excluding them from future rounds
    await ctx.db.patch(args.playerId, {
      hasLeft: true,
      isHost: false // Ensure they are no longer host
    });
  },
})
