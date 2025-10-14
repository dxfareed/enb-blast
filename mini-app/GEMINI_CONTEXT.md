### Project Context: ENB Mini App

This document provides a running summary of development and debugging sessions for the ENB Mini App to ensure context is maintained for future work.

### Session Summary (October 14, 2025)

During this session, the following issues were identified and resolved:

*   **Build Failure due to SDK:**
    *   **Problem:** The application failed to build due to an incorrect Farcaster SDK implementation in `app/api/game/start/route.ts`.
    *   **Solution:** Migrated the authentication logic from the deprecated `@farcaster/miniapp-sdk` to the correct `@farcaster/quick-auth` library, using the standard `createClient` and `verifyJwt` pattern.

*   **Stale Prisma Types:**
    *   **Problem:** TypeScript errors indicated that properties like `startTime` and `status` were missing from the `GameSession` model, despite being present in `schema.prisma`.
    *   **Solution:** Ran `npx prisma generate` to update the Prisma Client and its type definitions, resolving the type mismatch.

*   **UI Stuck in "Checking Status":**
    *   **Problem:** The claim status UI on the game page was getting stuck in a loading state.
    *   **Solution:** Decoupled the `fetchClaimStatus` call from the `useUser` hook's `onSuccess` callback in `app/dashboard/game/page.tsx`. The fetch is now triggered in a `useEffect` hook on component mount, ensuring it runs independently.

*   **Incorrect Cooldown Calculation:**
    *   **Problem:** The app displayed a hardcoded 12-hour cooldown, which was inconsistent with the on-chain data.
    *   **Solution:** Modified `app/api/claim/status/route.ts` to fetch the cooldown period dynamically from the smart contract by calling the `cooldownPeriod` function.

*   **Flawed Cooldown Logic:**
    *   **Problem:** A cooldown was being applied after every claim, even when the user had claims remaining in the cycle.
    *   **Solution:** Updated the logic in `app/api/claim/status/route.ts` to only enforce the cooldown *after* the user has exhausted all available claims (`claimsLeft <= 0`).

*   **API Rate Limiting:**
    *   **Problem:** The application was being rate-limited by the public Base RPC endpoint, causing `429` errors.
    *   **Solution:** Advised the user to switch to a dedicated RPC provider (e.g., Alchemy) to handle the request volume.

*   **API Timeout on Tasks Page:**
    *   **Problem:** The `/api/tasks` endpoint was timing out, likely due to slow database queries.
    *   **Solution:** Identified a missing database index on the `userId` field of the `UserTaskCompletion` model. The fix (adding `@@index([userId])`) was proposed but not yet applied.

*   **Game Duration Increased:**
    *   **Problem:** The game's 30-second duration was too short.
    *   **Solution:** Increased the `GAME_DURATION_SECONDS` in `app/api/game/end/route.ts` to 40 seconds.

*   **Score Not Saving on Timeout:**
    *   **Problem:** The player's score was not being saved if the game session timed out.
    *   **Solution:** Updated the timeout logic in `app/api/game/end/route.ts` to ensure the score is always saved, even for timed-out sessions.

*   **Missing "Game Starting" Loader:**
    *   **Problem:** The UI provided no feedback to the user while the game was being initiated, making it feel unresponsive.
    *   **Solution:** Added an `isStartingGame` state to `app/dashboard/game/page.tsx` and passed it to the `GameEngine` component to display a "Starting game..." message.