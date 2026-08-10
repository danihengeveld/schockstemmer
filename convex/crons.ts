import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Runs hourly so the 24h expiry deadline is enforced with reasonable
// precision without hammering the database.
crons.interval(
  "expire stale games",
  { hours: 1 },
  internal.maintenance.expireStaleGames,
)

export default crons
