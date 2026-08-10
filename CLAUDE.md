# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SchockStemmer is a mobile-first Next.js app for tracking "Schocken" drinking-game sessions: players join a game via a 6-character short code, vote each round on who will lose, and the app tallies drinking penalties. Real-time state (games, players, rounds, votes) is synced through Convex.

## Commands

- `pnpm dev` — start the Next.js dev server (uses Turbopack via `next dev`)
- `pnpm build` / `pnpm start` — production build / run
- `pnpm lint` — ESLint (flat config: `eslint-config-next` core-web-vitals + typescript, plus `eslint-config-prettier`)
- `pnpm exec convex dev` — run the Convex dev deployment (required alongside `pnpm dev` for backend functions to work; generates `convex/_generated/*`)

There is no test suite configured in this repo.

Package manager is **pnpm** (see `packageManager` in package.json) — do not use npm/yarn.

## Architecture

**Stack**: Next.js 16 (App Router, React 19, React Compiler enabled), Convex (DB + backend functions), Clerk (auth), next-intl (i18n: `en`/`nl`, default `en`), Tailwind CSS 4 + shadcn/ui (`style: base-nova`, icon library: hugeicons).

### Routing & i18n
All app routes live under `src/app/[locale]/...`. Locale routing is driven by `src/i18n/routing.ts` and wired into the single middleware at `src/proxy.ts`, which composes `clerkMiddleware` with next-intl's middleware — Clerk auth and locale resolution both run on every matched request. Translation strings live in `messages/en.json` and `messages/nl.json`; `src/i18n/request.ts` and `src/i18n/navigation.ts` provide the next-intl server/client wiring.

### Data model & backend (Convex)
Schema (`convex/schema.ts`) has four tables: `games` → `players` → `rounds` → `votes`, each scoped by `gameId`/`roundId` and looked up via explicit indexes (e.g. `by_game`, `by_round_and_voter`) rather than filters, for query efficiency.

- **games**: a session, identified by a short human-enterable `code` (`by_code` index), status `lobby | active | finished`.
- **players**: belong to a game; either authenticated (`clerkId` set) or guest (`clerkId` undefined). `hasLeft` marks a soft-removed player rather than deleting the row, so vote history survives.
- **rounds**: sequential per game (`roundNumber`), status `voting | pending | finished`, records the `loserId` once resolved.
- **votes**: one per player per round (upserted, not appended) recording who that player thinks will lose.

Backend logic lives in `convex/games.ts` (all mutations/queries) plus `convex/lib/`:
- `lib/auth.ts` — `verifyPlayerIdentity` and `verifyHostAuthorization`. Authenticated players are verified against the Clerk JWT identity (`ctx.auth.getUserIdentity()`); **guest players cannot be cryptographically verified** — their player ID (stored client-side) is the only credential. This asymmetry drives several deliberate trade-offs in `games.ts` (e.g. a guest name freed by `hasLeft` is never auto-reclaimed, to prevent impersonation — see comments in `joinGame`).
- `lib/helpers.ts` — pure functions: game code generation/validation (`GAME_CODE_REGEX`), and shot-count derivation (`calculatePlayerShots`, `deriveRoundResult`). Drinking rule: the round loser drinks 1 shot (2 if they voted for themselves), and any player who voted for the loser drinks 1.
- Convex auth is configured in `convex/auth.config.ts`, trusting the Clerk JWT issuer domain (`CLERK_JWT_ISSUER_DOMAIN`) with `applicationID: "convex"`. The frontend connects via `ConvexProviderWithClerk` in `src/components/providers/convex-client-provider.tsx`, so Convex calls automatically carry the signed-in Clerk session.

A round auto-advances from `voting` → `pending` once every active (non-`hasLeft`) player has voted (see `submitVote`); the host then resolves the loser via `finishRound`. Host handoff on leave is automatic (`leaveGame` promotes the next active player, or finishes the game if none remain).

### Frontend structure
- `src/components/game/` — game flow screens (lobby, voting, pending, results) and `results/` subcomponents; `game-card.tsx`, `leaderboard.tsx`, `round-history.tsx`, `round-detail-accordion.tsx` are shared across the active game and history views.
- `src/app/[locale]/game/[gameId]` and `src/app/[locale]/history/[gameId]` are the two dynamic route trees; both read from the same Convex queries (`getGame` for live play, `getGameHistory` for full detail) so shot/result derivation logic in `convex/lib/helpers.ts` stays single-sourced.
- `src/components/ui/` is generated/managed via shadcn (`components.json`); prefer `pnpm dlx shadcn add ...` over hand-writing primitives here.
- Path alias `@/*` maps to `src/*` (see `tsconfig.json`).

### Environment
Required env vars (see `.env.example`): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `NEXT_PUBLIC_CONVEX_URL`.
