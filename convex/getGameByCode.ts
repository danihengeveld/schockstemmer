import { v } from "convex/values"
import { query } from "./_generated/server"

export default query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_code", q => q.eq("code", args.code))
      .first();
  }
})
