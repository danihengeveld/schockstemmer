import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Game sessions (the "evening")
  games: defineTable({
    hostClerkId: v.string(),
    code: v.string(), // Short code for joining (e.g., "ABC123")
    status: v.union(v.literal("lobby"), v.literal("active"), v.literal("finished")),
    finishedAt: v.optional(v.number()),
  }).index("by_code", ["code"]),

  // Players in a game - can be guest or authenticated
  players: defineTable({
    gameId: v.id("games"),
    clerkId: v.optional(v.string()), // null for guests, set for authenticated users
    name: v.string(),
    isHost: v.boolean(),
    hasLeft: v.optional(v.boolean()),
  })
    .index("by_game", ["gameId"])
    .index("by_game_and_clerk", ["gameId", "clerkId"])
    .index("by_game_and_name", ["gameId", "name"]),

  // Rounds within a game
  rounds: defineTable({
    gameId: v.id("games"),
    roundNumber: v.number(),
    status: v.union(v.literal("voting"), v.literal("pending"), v.literal("finished")),
    loserId: v.optional(v.id("players")),
    finishedAt: v.optional(v.number()),
  }).index("by_game", ["gameId"]),

  // Votes - who each player thinks won't lose in a specific round
  votes: defineTable({
    roundId: v.id("rounds"),
    voterId: v.id("players"),
    votedForId: v.id("players"),
  })
    .index("by_round", ["roundId"])
    .index("by_round_and_voter", ["roundId", "voterId"])
    .index("by_round_and_voted_for", ["roundId", "votedForId"]),
})