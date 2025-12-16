import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Game sessions
  games: defineTable({
    hostClerkId: v.string(),
    code: v.string(), // Short code for joining (e.g., "ABC123")
    status: v.union(v.literal("lobby"), v.literal("voting"), v.literal("pending"), v.literal("finished")),
    loserId: v.optional(v.id("players")),
    finishedAt: v.optional(v.number()),
  }).index("by_code", ["code"]),

  // Players in a game - can be guest or authenticated
  players: defineTable({
    gameId: v.id("games"),
    clerkId: v.optional(v.string()), // null for guests, set for authenticated users
    email: v.optional(v.string()), // if added by guest, allows them to claim and find previous games later
    name: v.string(),
    isHost: v.boolean(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_clerk", ["gameId", "clerkId"])
    .index("by_game_and_name", ["gameId", "name"])
    .index("by_game_and_email", ["gameId", "email"]),

  // Votes - who each player thinks won't lose
  votes: defineTable({
    gameId: v.id("games"),
    voterId: v.id("players"),
    votedForId: v.id("players"),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_voter", ["gameId", "voterId"])
    .index("by_game_and_voted_for", ["gameId", "votedForId"]),
})