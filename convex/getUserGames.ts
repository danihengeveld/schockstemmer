import { query } from "../_generated/server"
import { calculatePlayerShots } from "../lib/helpers"

export default query({
  args: {},
  handler: async (ctx, _) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity || !identity.subject) {
      throw new Error("Not authenticated")
    }

    const playerRecords = await ctx.db
      .query("players")
      .filter(q => q.eq(q.field("clerkId"), identity.subject))
      .collect();

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
      const playerStats = players
        .map(player => ({
          playerId: player._id,
          playerName: player.name,
          totalShots: calculatePlayerShots(player, finishedRounds, allVotes)
        }))
        .sort((a, b) => b.totalShots - a.totalShots);

      // Find the overall worst player (most shots)
      const worstPlayer = playerStats.length > 0 && finishedRounds.length > 0 
        ? playerStats[0] 
        : null;

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
