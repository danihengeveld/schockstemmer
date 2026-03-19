# Refactor Audit — SchockStemmer

## Architecture Summary

SchockStemmer is a companion web app for the dice game "Schocken", played with friends. It manages game lobbies, real-time voting rounds, shot-penalty scoring, and game history. The stack is:

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + Shadcn UI
- **Backend:** Convex (real-time database + serverless functions)
- **Auth:** Clerk (JWT-based, integrated with both Next.js and Convex)
- **i18n:** next-intl (English + Dutch)
- **Hosting:** Vercel (inferred from analytics + config)
- **CI:** GitHub CodeQL analysis + Dependabot

### Data Flow

```
Browser ←→ Convex (real-time subscriptions)
   ↕              ↕
 Clerk JWT ← Clerk Auth Provider
```

### Route Structure

```
/[locale]                    → Home (create/join game)
/[locale]/game/[gameId]      → Active game (lobby → voting → pending → results)
/[locale]/history            → Game history list (auth required)
/[locale]/history/[gameId]   → Game detail view (auth required)
```

### Auth Model

- **Authenticated players**: Clerk JWT identity verified in every mutation via `verifyPlayerIdentity`. Queries that return sensitive data (`getGameHistory` for finished games, `getUserGames`) require authentication.
- **Guest players**: Identified by Convex-generated player ID stored in client localStorage. Server-side identity verification is not possible for guests — the player ID is the only credential. This is an acceptable trade-off for a friend-group game, but would need session tokens or mandatory auth for a public product.
- **Middleware**: Clerk middleware protects `/history` routes at the page level. However, Convex queries are called directly from the client, bypassing Next.js middleware. Therefore all data-access authorization lives in the Convex query/mutation handlers.

---

## What Changed

### Batch 1: Critical ESLint / Type Safety Fixes

| Change | Why | Risk |
|--------|-----|------|
| Created `src/hooks/use-local-storage.ts` using `useSyncExternalStore` | Replaces `useState` + `useEffect` pattern for reading localStorage, which triggered React compiler lint errors (`react-hooks/set-state-in-effect`). The new hook is the idiomatic React 19 approach. | Low — behavioral equivalent; `useSyncExternalStore` handles SSR gracefully with server snapshot returning `null`. |
| Converted `showJoinDialog` from state + effect to derived value | Was state updated via effect, but it's purely derived from other values — a textbook "you might not need an effect" case. | None — logically equivalent. |
| Fixed `activeRound?.loserId!` non-null assertion | Using `!` on an optional chain is unsafe (`@typescript-eslint/no-non-null-asserted-optional-chain`). Added `loserId` to the render guard condition so TypeScript narrows the type naturally. | Low — the component now doesn't render `ResultsView` if `loserId` is `undefined`, which is the correct behavior (no loser = nothing to show). |
| Removed unused `activePlayers` variable | Dead code flagged by `@typescript-eslint/no-unused-vars`. | None. |
| Fixed `Date.now()` in render | Calling `Date.now()` during render is impure (`react-hooks/purity`). Duration is now only computed for finished games (where `finishedAt` is defined). Conditional rendering hides the duration span when the game is still active. | Low — active (unfinished) games viewed in history no longer show a duration, which is correct behavior. |

### Batch 2: Convex Authorization Hardening (Pass 1)

| Change | Why | Risk |
|--------|-----|------|
| Added `verifyPlayerIdentity` helper | Centralizes the pattern of: fetch player → verify Clerk identity matches (for authenticated players). Used by `leaveGame`, `submitVote`, and internally by `verifyHostAuthorization`. | Low — only adds stricter checks, doesn't change success paths. |
| Refactored `verifyHostAuthorization` | Now delegates to `verifyPlayerIdentity` to avoid duplicated identity verification logic. | Low — same auth checks, different code structure. |
| Added identity check to `leaveGame` | Previously accepted any player ID with no verification. An attacker who guessed/intercepted a player ID could force any player to leave. Now verifies Clerk identity for authenticated players. | Low — guest players (no `clerkId`) still can't be server-verified, which is an inherent design limitation. |
| Added identity check to `submitVote` | Same as above — prevents voting on behalf of another authenticated player. Also added checks that voter and vote target belong to the same game and that the round is in `voting` status. | Low — adds strictly more validation. |
| Added round status check to `finishRound` | Prevents double-finishing a round (must be `pending`). | None — prevents invalid state transitions. |
| Added loser validation to `finishRound` | Verifies `loserId` belongs to the game and is an active player. | None — prevents selecting a player from a different game or a player who left. |
| Added game status check to `startGame` | Must be in `lobby` status. Prevents starting an already-active or finished game. | None. |
| Added game status check to `finishGame` | Must not be already `finished`. | None. |
| Added game status check to `startNextRound` | Must be `active`. | None. |

### Batch 3: Code Quality & Maintainability

| Change | Why | Risk |
|--------|-----|------|
| Added `src/app/[locale]/error.tsx` | Error boundary for graceful error handling instead of blank screens. | None. |
| Added `.env.example` | Documents required environment variables for new developers. | None. |
| Added `src/types/next-env.d.ts` | Provides Next.js image type declarations for TypeScript (fixes TS2307 on `import logo from '../../app/icon.png'`). | None — equivalent to the auto-generated `next-env.d.ts` that Next.js creates but was gitignored. |
| Updated `.gitignore` | Allow `.env.example` to be committed. Scoped `next-env.d.ts` ignore to root level only. | None. |

### Batch 4: Security Second Pass — Cross-User Data Access & Input Validation

Full re-audit of every Convex query/mutation, middleware path, and server/client boundary, assuming hostile clients.

| Change | Why | Risk |
|--------|-----|------|
| **Fixed `joinGame` player reactivation vulnerability** | Previously, an attacker could join a game with a name matching an existing player who had left, and the mutation would silently reactivate that player record — hijacking their slot, clerkId, and potentially host privileges. Now: authenticated users can only reactivate their own record (verified by Clerk JWT), and guest slots are never reactivated. A new player record is created instead. | **Low** — The only observable difference is that a guest who left and tries to rejoin with the same name will get a new player record instead of resuming their old one. Voting history is preserved under the original record. |
| **Added input validation to `joinGame` `guestName`** | No length or format validation existed. An attacker could submit empty strings, 10MB strings, or Unicode bombs. Now: names are trimmed, must be 1–50 characters. | None — clients already show name input. |
| **Added format validation to `getGameByCode`** | The query previously accepted any string (including extremely long garbage) and hit the database. Now validates `^[A-Z2-9]{6}$` before querying, rejecting obviously invalid codes without a database roundtrip. | None — only rejects strings that could never match a valid code. |
| **Added auth to `getGameHistory`** | This query returned complete voting data (all rounds, all votes) for any game, to any caller — even unauthenticated. Combined with knowledge of a game ID, this is a complete information disclosure. Now: finished games require an authenticated caller who participated in that game. Active games remain accessible (for the in-game round history panel used by guests). | **Low** — The history detail page (`/history/[gameId]`) is already behind Clerk middleware, so authenticated users see no difference. An unauthenticated caller who somehow has a finished game ID now gets `null` instead of full data. |
| **Added `by_clerkId` index to players table** | `getUserGames` previously did a full table scan (`filter` on `clerkId`). Now uses a proper index. | None — performance improvement, same data returned. |
| **Used `by_clerkId` index in `getUserGames`** | Switches from `.filter()` to `.withIndex("by_clerkId", ...)` for the player lookup. | None — same results, better performance. |
| **Hardened `leaveGame` host reassignment** | Previously found the next host with `.find((p) => p._id !== playerId)` after a separate filter — if the leaving player appeared in the list due to a timing issue, they could become the new host. Now excludes the leaving player directly in the Convex filter query (using `q.and()`), and uses `activePlayers[0]` deterministically. | None — same logic, more robust. |

---

## Current State After Refactor

- **ESLint:** 0 errors, 4 warnings (all in auto-generated `convex/_generated/` files)
- **TypeScript:** 0 errors (strict mode)
- **Convex mutations:** All 8 mutations have proper authorization, identity checks, state guards, and input validation
- **Convex queries:** All 4 queries use indexes correctly; `getGameHistory` and `getUserGames` enforce authentication where appropriate

### Security Posture Summary

| Mutation / Query | Auth | State Guards | Input Validation | Ownership |
|---|---|---|---|---|
| `createGame` | ✅ Clerk required | — | — | ✅ Creates own records |
| `joinGame` | ✅ Clerk-verified rejoin | ✅ Lobby only | ✅ Name trimmed, 1–50 chars | ✅ No reactivation of others' slots |
| `leaveGame` | ✅ `verifyPlayerIdentity` | ✅ Idempotent | — | ✅ Can only leave own slot |
| `startGame` | ✅ `verifyHostAuthorization` | ✅ Lobby only | — | ✅ Host-only |
| `finishGame` | ✅ `verifyHostAuthorization` | ✅ Not already finished | — | ✅ Host-only |
| `finishRound` | ✅ `verifyHostAuthorization` | ✅ Pending only | — | ✅ Loser validated in-game |
| `startNextRound` | ✅ `verifyHostAuthorization` | ✅ Active only | — | ✅ Host-only |
| `submitVote` | ✅ `verifyPlayerIdentity` | ✅ Voting only | — | ✅ Voter + target validated |
| `getGameByCode` | — (public) | — | ✅ `^[A-Z2-9]{6}$` | — |
| `getGame` | — (public) | — | — | — (required for guest play) |
| `getGameHistory` | ✅ Finished → auth required | — | — | ✅ Participant check for finished games |
| `getUserGames` | ✅ Clerk required | — | — | ✅ Returns only caller's games |

---

## Remaining Issues & Recommendations

### Deferred (too risky or too large for this PR)

1. **Guest player identity is unverifiable server-side** — Guest players (no Clerk account) are identified solely by player ID stored in client localStorage. A determined attacker who obtains a player ID could impersonate that player. Mitigation: game codes are short-lived and player IDs are Convex-generated UUIDs, making this a low practical risk for a friend-group game. A longer-term fix would require session tokens or requiring all players to authenticate.

2. **`getGame` query is fully public** — Anyone with a valid game ID can subscribe to real-time game data (players, current round, votes). This is intentional for the guest-accessible game page, but means a determined attacker with a game ID can observe a game in progress. Convex IDs are random 128-bit values that can't be enumerated, and game codes are the only external entry point (now format-validated). Risk: LOW for a friend-group app.

3. **No rate limiting / abuse prevention** — Game creation, joining, voting, and game code lookup have no rate limits. Convex doesn't have built-in rate limiting, so this would require a custom implementation (e.g., action-based throttling or IP-based limits at the edge). The `getGameByCode` format validation reduces the attack surface by rejecting invalid codes immediately.

4. **Game code generation uses `Math.random()`** — Not cryptographically secure, but the code space is 32^6 ≈ 1 billion, and codes are short-lived (games finish quickly). With the format validation on lookup, brute-force is impractical. For a public product, use `crypto.getRandomValues()`.

5. **No test suite** — The repo has zero tests. Adding Vitest + React Testing Library for component tests, and Convex test helpers for mutation/query tests would significantly improve confidence. Recommended as a follow-up.

6. **No CI lint/typecheck** — Only CodeQL runs in CI. Adding a GitHub Actions workflow for `pnpm lint && tsc --noEmit` would catch regressions.

7. **Hardcoded base URL** — `sitemap.ts`, `robots.ts`, and metadata use `https://schockstemmer.hengeveld.dev` as a hardcoded base URL. Consider moving to an environment variable.

8. **Version hardcoded in footer** — `footer.tsx` has `<Badge>v1.3.1</Badge>` hardcoded.

### Low-Priority Polish

- Footer uses `next/link` for external links instead of plain `<a>` (works but `next/link` is intended for internal navigation)
- Some UI components from Shadcn may be unused (e.g., `textarea.tsx`) — no harm in keeping them
- The `loading.tsx` file uses `"use client"` + `useTranslations` — this is fine but means the loading UI requires client JS to render
- `convex/auth.config.ts` uses `process.env.CLERK_JWT_ISSUER_DOMAIN!` non-null assertion — this runs in Convex server environment where the env var is expected to be set, so it's acceptable

---

## Summary of All Changes

| Category | Files Changed | Impact |
|----------|---------------|--------|
| React lint fixes | `src/app/[locale]/game/[gameId]/page.tsx`, `src/app/[locale]/history/[gameId]/page.tsx` | Fixed 4 ESLint errors |
| New hook | `src/hooks/use-local-storage.ts` | Idiomatic React 19 localStorage pattern |
| Convex security (pass 1) | `convex/games.ts`, `convex/lib/auth.ts` | All mutations hardened with auth + state guards |
| Convex security (pass 2) | `convex/games.ts`, `convex/schema.ts` | joinGame reactivation fix, input validation, getGameHistory auth, by_clerkId index |
| Error handling | `src/app/[locale]/error.tsx` | Graceful error boundary |
| TypeScript | `src/types/next-env.d.ts` | Fixed pre-existing TS2307 error |
| Developer experience | `.env.example`, `.gitignore` | Environment variable documentation |
| Documentation | `REFACTOR_AUDIT.md` | This audit document |

### No Breaking Changes

All changes are additive or strictly tightening. Existing behavior is preserved for valid use cases. The only observable differences are:
- Invalid mutation calls (wrong player, wrong game state) now throw explicit errors instead of silently succeeding or causing data corruption
- A guest who left and tries to rejoin with the same name will get a new player record instead of resuming the old one
- Unauthenticated callers can no longer read finished game history via direct Convex query calls
- The history detail page no longer shows a duration for in-progress games (previously showed a stale estimate)
