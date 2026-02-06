import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"

/**
 * Verify that a player is the host and authorized to perform host actions.
 */
export async function verifyHostAuthorization(
  ctx: MutationCtx,
  playerId: Id<"players">,
  gameId: Id<"games">
): Promise<void> {
  const player = await ctx.db.get(playerId)

  if (!player || player.gameId !== gameId || !player.isHost) {
    throw new Error("Only the host can perform this action")
  }

  // Verify authentication if player has a linked account
  const identity = await ctx.auth.getUserIdentity()
  if (player.clerkId && (!identity || identity.subject !== player.clerkId)) {
    throw new Error("Unauthorized host action")
  }
}
