import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { verifyHostAuthorization } from "./lib/auth"

export default mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    await verifyHostAuthorization(ctx, args.playerId, args.gameId)

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
