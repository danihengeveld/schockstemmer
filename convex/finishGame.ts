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

    await ctx.db.patch(args.gameId, {
      status: "finished",
      finishedAt: Date.now(),
    })
  }
})
