import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { verifyHostAuthorization } from "./lib/auth"

export default mutation({
  args: {
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    loserId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId)
    if (!round) throw new Error("Round not found")

    await verifyHostAuthorization(ctx, args.playerId, round.gameId)

    await ctx.db.patch(args.roundId, {
      status: "finished",
      loserId: args.loserId,
      finishedAt: Date.now(),
    })
  },
})
