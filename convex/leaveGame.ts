import { v } from "convex/values"
import { mutation } from "./_generated/server"

export default mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args): Promise<void> => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return

    const gameId = player.gameId;

    // Handle host leaving - transfer to another player or end game
    if (player.isHost) {
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .filter((q) => q.neq(q.field("hasLeft"), true))
        .collect();

      const newHost = activePlayers.find((p) => p._id !== args.playerId);
      
      if (newHost) {
        await ctx.db.patch(newHost._id, { isHost: true });

        if (newHost.clerkId) {
          await ctx.db.patch(gameId, { hostClerkId: newHost.clerkId });
        }
      } else {
        // No players left, mark game as finished
        await ctx.db.patch(gameId, { 
          status: "finished", 
          finishedAt: Date.now() 
        });
      }
    }

    // Mark player as having left (preserves historical data)
    await ctx.db.patch(args.playerId, {
      hasLeft: true,
      isHost: false
    });
  },
})
