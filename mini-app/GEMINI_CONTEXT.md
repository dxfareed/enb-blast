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

*   **Improved UX with Loading Indicators:**
    *   **Problem:** The UI lacked feedback during asynchronous operations like starting a game or saving a score, making it feel unresponsive.
    *   **Solution:**
        *   Added a loading spinner to the game start screen, replacing the static "Starting game..." text.
        *   Implemented an auto-retry mechanism (up to 3 attempts) in `handleStartGame` to handle transient 5xx server errors gracefully.
        *   Added a loading spinner to the "Game Over" screen, which displays while the final score is being submitted to the backend.

*   **Missing "Game Starting" Loader:**
    *   **Problem:** The UI provided no feedback to the user while the game was being initiated, making it feel unresponsive.
    *   **Solution:** Added an `isStartingGame` state to `app/dashboard/game/page.tsx` and passed it to the `GameEngine` component to display a "Starting game..." message.

### Security Proposal (October 14, 2025)

*   **Vulnerability:** Client-Side Score Manipulation.
    *   **Problem:** The game score is calculated entirely on the client-side (`GameEngine.tsx`) and sent to the `/api/game/end` endpoint. The server currently trusts this score, making it trivial for a malicious user to intercept the request and submit a fraudulent, high score.
    *   **Proposed Solution:** Implement Server-Authoritative Scoring.
        *   **Client-Side Change:** Instead of sending the final score, the client will send a summary of game actions (e.g., number of each type of item collected).
        *   **Server-Side Change:** The `/api/game/end` endpoint will be modified to calculate the score based on the received game actions. It will also perform validation to ensure the actions are plausible for a single game session. This makes the server the source of truth for the score, preventing cheating.
        *   **Performance:** This change will have a negligible impact on user-perceived performance, as the calculation is fast and occurs during an existing network request that is already covered by a loading spinner.