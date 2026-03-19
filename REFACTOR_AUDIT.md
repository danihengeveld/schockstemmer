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

### Batch 2: Convex Authorization Hardening

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

---

## Current State After Refactor

- **ESLint:** 0 errors, 4 warnings (all in auto-generated `convex/_generated/` files)
- **TypeScript:** 0 errors (strict mode)
- **Convex mutations:** All 8 mutations have proper authorization and state guards
- **Convex queries:** All 4 queries use indexes correctly

---

## Remaining Issues & Recommendations

### Deferred (too risky or too large for this PR)

1. **Guest player identity is unverifiable server-side** — Guest players (no Clerk account) are identified solely by player ID stored in client localStorage. A determined attacker who obtains a player ID could impersonate that player. Mitigation: game codes are short-lived and player IDs are Convex-generated UUIDs, making this a low practical risk for a friend-group game. A longer-term fix would require session tokens or requiring all players to authenticate.

2. **Missing `by_clerkId` index on players table** — `getUserGames` filters players by `clerkId` without an index (full table scan). For small scale this is fine; at scale, add `.index("by_clerk", ["clerkId"])` to the `players` table.

3. **No rate limiting / abuse prevention** — Game creation, joining, and voting have no rate limits. Convex doesn't have built-in rate limiting, so this would require a custom implementation (e.g., action-based throttling or IP-based limits at the edge).

4. **No test suite** — The repo has zero tests. Adding Vitest + React Testing Library for component tests, and Convex test helpers for mutation/query tests would significantly improve confidence. Recommended as a follow-up.

5. **No CI lint/typecheck** — Only CodeQL runs in CI. Adding a GitHub Actions workflow for `pnpm lint && tsc --noEmit` would catch regressions.

6. **Hardcoded base URL** — `sitemap.ts`, `robots.ts`, and metadata use `https://schockstemmer.hengeveld.dev` as a hardcoded base URL. Consider moving to an environment variable or `metadataBase` pattern for flexibility.

7. **Version hardcoded in footer** — `footer.tsx` has `<Badge>v1.3.1</Badge>` hardcoded. Consider reading from `package.json` or an environment variable.

### Low-Priority Polish

- Footer uses `next/link` for external links instead of plain `<a>` (works but `next/link` is intended for internal navigation)
- Some UI components from Shadcn may be unused (e.g., `textarea.tsx`) — no harm in keeping them
- The `loading.tsx` file uses `"use client"` + `useTranslations` — this is fine but means the loading UI requires client JS to render
- Game code generation uses `Math.random()` which is not cryptographically secure — acceptable for 6-character join codes in a friend-group context
- `convex/auth.config.ts` uses `process.env.CLERK_JWT_ISSUER_DOMAIN!` non-null assertion — this runs in Convex server environment where the env var is expected to be set, so it's acceptable

---

## Summary of All Changes

| Category | Files Changed | Impact |
|----------|---------------|--------|
| React lint fixes | `src/app/[locale]/game/[gameId]/page.tsx`, `src/app/[locale]/history/[gameId]/page.tsx` | Fixed 4 ESLint errors |
| New hook | `src/hooks/use-local-storage.ts` | Idiomatic React 19 localStorage pattern |
| Convex security | `convex/games.ts`, `convex/lib/auth.ts` | All mutations hardened with auth + state guards |
| Error handling | `src/app/[locale]/error.tsx` | Graceful error boundary |
| TypeScript | `src/types/next-env.d.ts` | Fixed pre-existing TS2307 error |
| Developer experience | `.env.example`, `.gitignore` | Environment variable documentation |
| Documentation | `REFACTOR_AUDIT.md` | This audit document |

### No Breaking Changes

All changes are additive or strictly tightening. Existing behavior is preserved for valid use cases. The only observable difference is that:
- Invalid mutation calls (wrong player, wrong game state) now throw explicit errors instead of silently succeeding or causing data corruption
- The history detail page no longer shows a duration for in-progress games (previously showed a stale estimate)
