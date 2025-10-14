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

### Security Fix (October 14, 2025)

*   **Vulnerability:** Client-Side Score Manipulation.
    *   **Problem:** The game score was calculated entirely on the client-side (`GameEngine.tsx`) and sent to the `/api/game/end` endpoint. The server trusted this score, making it trivial for a malicious user to intercept the request and submit a fraudulent, high score.
    *   **Solution:** Implemented Server-Authoritative Scoring.
        *   **Client-Side Change:** The `GameEngine` was modified to record a log of all game events (e.g., collecting an item, hitting a bomb). This event log, rather than a final score, is now sent to the server.
        *   **Server-Side Change:** The `/api/game/end` endpoint was completely refactored. It now securely calculates the score based on the received event log and server-defined item values. It also performs validation checks on the session duration and event rate to prevent cheating. This makes the server the single source of truth for the score.

### Reliability & UX Improvements (October 14, 2025)

*   **Unreliable Server Communication:**
    *   **Problem:** Critical actions like starting a game, saving a score, or checking claim status would fail permanently on transient server errors (5xx), forcing the user to retry manually.
    *   **Solution:** Implemented an auto-retry mechanism (up to 3 attempts) in `app/dashboard/game/page.tsx` for `handleStartGame`, `handleGameWin`, and `fetchClaimStatus`. The app now automatically retries on server errors, making the experience more seamless and reliable.

*   **Lack of Feedback During Retries:**
    *   **Problem:** The UI provided no feedback when a server request was being retried, making the app feel unresponsive.
    *   **Solution:** Added a non-intrusive "info" toast that displays "Server timeout. Reconnecting..." when a retry occurs. The toast automatically dismisses after 0.7 seconds. This required making the `Toast.tsx` component more flexible by accepting a `duration` prop.

### UI/UX Enhancements (October 14, 2025)

*   **Static Loading Screen:**
    *   **Problem:** The "Starting game..." screen was static and unengaging.
    *   **Solution:** Implemented a "Did you know?" feature that displays fun facts about the Base blockchain. A new `DidYouKnow.tsx` component was created to cycle through a list of facts from `app/utils/constants.ts` every second, making the loading experience more interesting for the user. New facts specific to the ENB project were also added.
