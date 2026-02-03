import { mutation } from "./_generated/server"
import { generateGameCode } from "./lib/helpers"

export default mutation({
  args: {},
  handler: async (ctx, _) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || !identity.subject || !identity.givenName) {
      throw new Error("Unauthorized")
    }

    const code = generateGameCode()

    const gameId = await ctx.db.insert("games", {
      hostClerkId: identity.subject,
      code,
      status: "lobby",
    })

    const playerId = await ctx.db.insert("players", {
      gameId,
      clerkId: identity.subject,
      name: identity.givenName,
      isHost: true,
    })

    return { gameId, playerId }
  },
})
