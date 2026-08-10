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
    console.error("verifyPlayerIdentity: rejected, player not found", { playerId })
    throw new Error("Player not found")
  }

  const identity = await ctx.auth.getUserIdentity()
  if (player.clerkId && (!identity || identity.subject !== player.clerkId)) {
    console.error("verifyPlayerIdentity: rejected, identity mismatch", {
      playerId,
      expectedClerkId: player.clerkId,
      actualSubject: identity?.subject,
    })
    throw new Error("Unauthorized: identity mismatch")
  }

  console.debug("verifyPlayerIdentity: verified", { playerId, gameId: player.gameId })

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
    console.error("verifyHostAuthorization: rejected, not the host", {
      playerId,
      gameId,
      playerGameId: player.gameId,
      isHost: player.isHost,
    })
    throw new Error("Only the host can perform this action")
  }
}
