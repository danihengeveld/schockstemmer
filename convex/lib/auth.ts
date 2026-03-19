import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

/**
 * Verify that the caller is the given player.
 *
 * For authenticated players (those with a clerkId), we verify the
 * Clerk JWT identity matches. For guest players without a linked
 * account, server-side verification isn't possible — the player ID
 * is the only credential and is stored in the client's localStorage.
 *
 * Returns the player document if verification succeeds.
 */
export async function verifyPlayerIdentity(
  ctx: MutationCtx,
  playerId: Id<"players">,
): Promise<Doc<"players">> {
  const player = await ctx.db.get(playerId)
  if (!player) {
    throw new Error("Player not found")
  }

  const identity = await ctx.auth.getUserIdentity()
  if (player.clerkId && (!identity || identity.subject !== player.clerkId)) {
    throw new Error("Unauthorized: identity mismatch")
  }

  return player
}

/**
 * Verify that a player is the host and authorized to perform host actions.
 */
export async function verifyHostAuthorization(
  ctx: MutationCtx,
  playerId: Id<"players">,
  gameId: Id<"games">
): Promise<void> {
  const player = await verifyPlayerIdentity(ctx, playerId)

  if (player.gameId !== gameId || !player.isHost) {
    throw new Error("Only the host can perform this action")
  }
}
