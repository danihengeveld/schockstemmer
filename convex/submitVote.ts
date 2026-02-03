import { v } from "convex/values"
import { mutation } from "./_generated/server"

export default mutation({
  args: {
    roundId: v.id("rounds"),
    voterId: v.id("players"),
    votedForId: v.id("players")
  },
  handler: async (ctx, args) => {
    // Check if player already voted
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_round_and_voter", (q) => 
        q.eq("roundId", args.roundId).eq("voterId", args.voterId)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { votedForId: args.votedForId })
    } else {
      await ctx.db.insert("votes", {
        roundId: args.roundId,
        voterId: args.voterId,
        votedForId: args.votedForId,
      })
    }

    // Check if all active players have voted
    const round = await ctx.db.get(args.roundId)
    if (!round) throw new Error("Round not found")

    const activePlayers = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", round.gameId))
      .filter((q) => q.neq(q.field("hasLeft"), true))
      .collect()

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_round", (q) => q.eq("roundId", args.roundId))
      .collect()

    if (votes.length >= activePlayers.length) {
      await ctx.db.patch(args.roundId, { status: "pending" })
    }
  },
})
