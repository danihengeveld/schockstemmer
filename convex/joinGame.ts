import { v } from "convex/values"
import { mutation } from "./_generated/server"

export default mutation({
  args: {
    gameId: v.id("games"),
    guestName: v.string()
  },
  handler: async (ctx, args) => {
    const { gameId, guestName } = args
    const game = await ctx.db.get(gameId)
    
    if (!game) {
      return { success: false, error: "Game not found" }
    }
    
    if (game.status !== "lobby") {
      return { success: false, error: "Game already started" }
    }

    // Check for duplicate name
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
        clerkId: identity?.subject || existing.clerkId,
      })

      return { success: true, playerId: existing._id }
    }

    // Create new player
    const identity = await ctx.auth.getUserIdentity()
    const playerId = await ctx.db.insert("players", {
      gameId,
      name: guestName,
      isHost: false,
      clerkId: identity?.subject,
    })

    return { success: true, playerId }
  },
})
