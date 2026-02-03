import { v } from "convex/values"
import { query } from "./_generated/server"

export default query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) return null

    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("gameId"), args.gameId))
      .collect()

    const allRounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()

    const allVotes = await ctx.db
      .query("votes")
      .filter((q) => q.or(
        ...allRounds.map(r => q.eq(q.field("roundId"), r._id))
      ))
      .collect()

    const activeRound = allRounds.find(r => r.status !== "finished") 
      || allRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];

    const currentVotes = activeRound 
      ? allVotes.filter(v => v.roundId === activeRound._id) 
      : [];

    return { game, players, activeRound, votes: currentVotes, allVotes, rounds: allRounds }
  },
})
