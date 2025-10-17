### Project Context: ENB Mini App

**Role:** Senior Developer

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

### Session Summary (October 15, 2025)

*   **Added Apology Modal:**
    *   **Reason:** To inform users about a recent service interruption due to system upgrades.
    *   **Implementation:** Created a new `ApologyModal` component and corresponding CSS. The modal is now displayed automatically on the game page after it loads to ensure users see the message.

*   **Improved Welcome Page Reliability:**
    *   **Problem:** The initial user registration check would fail permanently on a server timeout.
    *   **Solution:** Implemented an auto-retry mechanism on the welcome page. It now attempts to connect up to 3 times, showing a "Reconnecting..." toast, before displaying a final error message.

*   **Enforced Active User Status:**
    *   **Problem:** Non-active (pending) users could access the game page.
    *   **Solution:** Added a check in `app/dashboard/game/page.tsx` that verifies the user's `registrationStatus`. If the user is not `ACTIVE`, they are automatically redirected to the registration page.

*   **Security Fix: Prevented Pending User Claims:**
    *   **Vulnerability:** The `/api/claim/signature` endpoint was issuing valid claim signatures to users whose status was still `PENDING` in the database, allowing them to bypass the intended registration flow and claim tokens.
    *   **Solution:** Added a critical authorization check to the endpoint. It now verifies that the user's `registrationStatus` is `ACTIVE` before generating a signature, returning a `403 Forbidden` error if they are not.

*   **Game Over UI Enhancement:**
    *   **Request:** To visually distinguish the "Game Over" screen from the active game area.
    *   **Solution:** Implemented a CSS blur effect that is applied to the game background when the game state changes to 'won' or 'lost'. This helps the game over/results overlay stand out.

*   **Corrected Mute Button Style:**
    *   **Problem:** A previous change unintentionally added a black border to the mute button.
    *   **Solution:** Explicitly set `border: none;` on the mute button's CSS to remove the unwanted default browser styling.

*   **One-Time Apology Modal:**
    *   **Request:** To prevent the apology modal from appearing on every visit.
    *   **Solution:** Implemented a check using `localStorage`. The modal is now shown only once per user and is hidden on subsequent visits after being dismissed.

*   **Claim Status API Optimization:**
    *   **Problem:** The `/api/claim/status` endpoint was making three separate RPC calls on every request, causing unnecessary latency.
    *   **Solution:** Refactored the endpoint to fetch constant contract values (`maxClaimsPerCycle`, `cooldownPeriod`) only once when the serverless function initializes. This reduced the number of RPC calls per request from three to one, significantly speeding up the response.

*   **Refined Mute Button UI:**
    *   **Request:** To make the mute button larger and less obtrusive.
    *   **Solution:** Increased the size of the mute button and its icon, removed the background color to make it transparent, and added a hover effect for better user feedback.

### Feature: Weekly Leaderboard Recap (October 15, 2025)

*   **Functionality:** Created a new standalone page at `/app/weekly-leaderboard/page.tsx` to display a user's individual stats (rank, points, earnings) from the previous week's leaderboard.
*   **Implementation:**
    *   Implemented a one-time, full-page redirect managed in `app/rootProvider.tsx`.
    *   The redirect triggers for users after Thursday 4 PM UTC if they haven't seen the recap for that week.
    *   Uses `localStorage` (`lastSeenWeeklyLeaderboard`) to ensure the page is only shown once per week.
    *   A utility function in `app/utils/time.ts` handles the weekly time logic.
*   **Development Status:**
    *   The feature is currently in a temporary **testing mode** in `app/utils/time.ts` to force the redirect on every app load for development and review.
    *   The UI was iteratively refined based on feedback to be a compact, single-card display that shows only the current user's stats, matching the app's existing light-theme style.
*   **Data Correction & Bug Fix:**
    *   **Problem 1:** The recap card incorrectly displayed "Weekly Points" as the "Amount Earned".
    *   **Solution 1:** Modified the `/api/leaderboard` endpoint to include the `totalClaimed` field from the database in its response. Updated the frontend to display this correct value.
    *   **Problem 2:** The page showed "NaN" for users who had never claimed, as their `totalClaimed` value was `null`.
    *   **Solution 2:** Made the backend and frontend more robust. The API now defaults `null` values to `0` before sending the response, and the frontend component includes a fallback to prevent parsing errors.

### Feature: Weekly Leaderboard Sharing (October 16, 2025)

*   **Functionality:** Implemented a feature allowing users to share their weekly leaderboard recap directly to their Farcaster feed.
*   **Implementation:**
    *   **Share Button:** Added a "Share Recap" button to the `/app/weekly-leaderboard/page.tsx`.
    *   **Farcaster Frame:** Created a new Farcaster frame page at `/app/share-frame/leaderboard/page.tsx` to generate the appropriate `fc:frame` meta tags.
    *   **Dynamic Image:** Created a new API endpoint at `/app/api/frame-image/leaderboard/route.tsx` to dynamically generate a 600x400 PNG image for the frame. The image is styled to match a user-provided design, displaying the user's PFP and their total "Amount Earned."
    *   **In-App Sharing:** The share button utilizes the `@farcaster/miniapp-sdk` to trigger the native Farcaster composer, embedding the frame URL directly in the cast.
*   **Bug Fixes & Refinements:**
    *   **Corrected Share Mechanism:** Replaced an incorrect `window.open` implementation with `sdk.actions.composeCast` for a native, in-app sharing experience.
    *   **Resolved Build Errors:**
        *   Added the `"use client"` directive to `/app/weekly-leaderboard/page.tsx` to fix errors related to client-side hooks.
        *   Corrected the font file path in the image generation API to use an absolute URL, fixing a "Module not found" build error.
    *   **Refined Frame Design:** Iteratively updated the frame image's JSX and styling to precisely match the user's visual specifications, resulting in a cleaner, more focused design.

### Reliability & UX Fix (October 16, 2025)

*   **Post-Cooldown Claims Stuck:**
    *   **Problem:** After the claim cooldown period ended, the UI would still incorrectly show "0 claims left," preventing the user from playing again. This was because the API was literally reporting the on-chain state, which only resets during the *next* claim transaction.
    *   **Solution (2-Part):**
        *   **API Fix:** The `/api/claim/status` endpoint was updated to be more intelligent. It now detects when the cooldown has expired and proactively reports the maximum number of claims to the frontend, effectively unblocking the user.
        *   **Frontend Fix:** The countdown timer on the game page (`/app/dashboard/game/page.tsx`) was enhanced to automatically call `fetchClaimStatus` the moment it finishes. This ensures the UI immediately updates to show the replenished claims without requiring a manual refresh.

### Feature: Automated Weekly Leaderboard Snapshot & Rewards (October 16, 2025)

*   **Functionality:** Implemented a robust, automated system to handle the end-of-week leaderboard process. This system ensures that a user's weekly recap is based on a permanent, accurate snapshot of the previous week's results and that rewards are distributed reliably.
*   **Implementation Details:**
    *   **Database Schema:** Added a new `WeeklyLeaderboardHistory` model to `prisma/schema.prisma`. This table stores an immutable record of the top 15 users' rank, points, and rewards earned for each week.
    *   **Snapshot & Reset Cron Job:** The existing `/api/cron/reset-weekly-points` job was refactored. It now first captures the final leaderboard state and saves it to the `WeeklyLeaderboardHistory` table before resetting the `weeklyPoints` for all users.
    *   **Reward Distribution Cron Job:** A new, separate cron job was created at `/api/cron/reward-weekly-leaderboard`. This job reads from the history table and distributes the correct tiered rewards to the top 15 users by sending transactions to their primary `walletAddress`.
    *   **Scheduling:** Both cron jobs were scheduled in `vercel.json` to run automatically every Thursday. The snapshot/reset job runs at 3:55 PM UTC, and the reward distribution job follows at 3:58 PM UTC.
    *   **Recap Page Accuracy:** The weekly recap page (`/app/weekly-leaderboard/page.tsx`) was updated to fetch data from a new `/api/leaderboard/history` endpoint, which reads from the snapshot table. This ensures the recap is always accurate.
    *   **Reliability:** A 3-attempt retry mechanism was added to the database operations within both cron jobs to make them resilient to transient connection errors or timeouts.

### Session Summary (October 16, 2025)

*   **UI Font Size Reduction:**
    *   **Request:** The font sizes on the Tasks and Leaderboard pages were too large.
    *   **Solution:** Reduced the font sizes of various text elements in `app/dashboard/tasks/page.module.css` and `app/dashboard/leaderboard/page.module.css` for a more compact and readable UI.

*   **Build Fix: Type Error in Cron Job:**
    *   **Problem:** The build was failing due to a type error when comparing a Prisma `Decimal` type with a `number` in the reward distribution cron job.
    *   **Solution:** Corrected the code in `app/api/cron/reward-weekly-leaderboard/route.ts` to convert the `Decimal` value to a `number` before the comparison (`.toNumber()`), resolving the build error.

*   **Daily Task Score Update:**
    *   **Request:** To increase the points awarded for daily tasks.
    *   **Solution:** Modified the `prisma/seed.mjs` file. The "Use Multiplier" task was removed, and the reward points for the remaining daily tasks ("Play the Game," "Claim Your Tokens," "Visit the Leaderboard") were increased to 200 each.

*   **Feature: Automated Daily Task Reset:**
    *   **Functionality:** Created a cron job to automatically reset the completion status of daily tasks for all users.
    *   **Implementation:**
        *   Created a new API route at `/api/cron/reset-daily-tasks/route.ts` that deletes all `UserTaskCompletion` records associated with daily tasks.
        *   Scheduled the job in `vercel.json` to run every day at 12:00 AM UTC.
        *   Added a `withRetry` utility to make the database operations more resilient to connection failures.

*   **Feature: Weekly Recap Background Animation:**
    *   **Request:** To add a "hydro-dipping" style animated background to the weekly recap page.
    *   **Implementation:**
        *   Created a new `HydroDipAnimation.tsx` component using `p5.js` to generate a fluid, swirling animation of images.
        *   Added the animation to the `/app/weekly-recap/page.tsx`.
    *   **Bug Fix:**
        *   **Problem:** The animation was not visible.
        *   **Solution:** The issue was caused by a global background color on the `body` element in `globals.css` that was obscuring the animation canvas. The fix involved removing the `background` property from the `body` to allow the animation to be seen.

### Feature: Mandatory Weekly Recap Sharing (October 16, 2025)

*   **Functionality:** Implemented a mandatory two-step flow on the weekly leaderboard recap page (`/app/weekly-leaderboard/page.tsx`). Users must now share their weekly stats to Farcaster before they can proceed to the main game.
*   **Implementation Details:**
    *   **State Management:** The page uses a `hasShared` state, which is initialized by checking a `hasSharedWeeklyRecap_v2` flag in `localStorage`.
    *   **Conditional UI:**
        *   If the user has not shared for the current week, the page displays only a "Share Recap" button.
        *   Upon successful sharing (verified by the `composeCast` SDK call returning a cast object), the `hasShared` state is updated, and the `localStorage` flag is set for the current week.
        *   The UI then dynamically replaces the "Share Recap" button with a "Continue to Game" button.
    *   **Persistence:** If the user has already shared for the week (checked on page load), the UI will immediately show the "Continue to Game" button, providing a seamless experience on subsequent visits within the same week.
    *   **SSR Error Fix:** A `window is not defined` error, caused by an animation component, was resolved by dynamically importing the component with SSR disabled (`dynamic(() => import(...), { ssr: false })`). This was part of an earlier, abandoned modal-based approach but the learning was carried over.

### Session Summary (October 17, 2025)

*   **Game Dashboard UI Overhaul:**
    *   **Request:** To maximize the game area on the game dashboard page (`/dashboard/game`) by removing the top header (marquee, buy button, token balance). These elements should remain on all other dashboard pages.
    *   **Implementation:**
        *   In `app/dashboard/layout.tsx`, the `usePathname` hook was used to conditionally render the `<header>` and `<Marquee>` components, hiding them when the path is `/dashboard/game`.
        *   The main content area was given a dynamic class to adjust its styling on the game page.
*   **Tooltip/Tour Fix:**
    *   **Problem:** The guided tour was breaking on the game page because its first step pointed to the token balance, which was now hidden.
    *   **Solution:** The tour steps are now dynamically filtered in `app/dashboard/layout.tsx`. The "token-balance" step is removed from the tour when the user is on the game page, ensuring the tour only highlights visible elements.
*   **Game Area Sizing:**
    *   **Problem:** The game area itself was not expanding to fill the newly available vertical space.
    *   **Solution:** After several adjustments, the final fix was to modify the game's own stylesheet (`app/dashboard/game/game.module.css`). The `min-height` of the `.gameArea` class was adjusted to `37rem` to achieve the desired height.

### Session Summary (October 17, 2025) - Part 2

*   **Feature: Free-to-Play Game Conversion:**
    *   **Request:** To remove all token-claiming mechanics and convert the game into a pure, score-based free-to-play experience.
    *   **Implementation:**
        *   **Frontend:** Refactored `app/dashboard/game/page.tsx` and `app/components/GameEngine.tsx` to completely remove wagmi/viem dependencies, claim buttons, cooldown timers, and any UI related to on-chain interactions. The game-over screen was simplified to only show "Play Again" and "Share Score" options.
        *   **Share Text:** The `handleShareScoreFrame` function was updated to generate a cast that focuses only on the user's score, removing all mentions of tokens or monetary value.
        *   **Backend:** The `/api/game/end/route.ts` endpoint was modified to save the player's score directly to their user profile in the database. It now increments `weeklyPoints`, `totalPoints`, and `gamesPlayed` in a single transaction, ensuring the score is tracked for the leaderboard.

*   **Bug Fix: Item Spawning Logic:**
    *   **Problem:** A bug introduced during the refactor caused only "picture" items to spawn, with no bombs or power-ups.
    *   **Solution:** Corrected the cumulative probability logic in the `gameLoop` function within `GameEngine.tsx`. This restored the intended spawn rates for all item types.

*   **Bug Fix: Missing "Saving Score" Loader:**
    *   **Problem:** The "Saving score..." loading indicator was not appearing on the game-over screen because the UI would only update after the save operation was complete.
    *   **Solution:** Modified the `handleGameWin` function in `app/dashboard/game/page.tsx` to set the `isGameWon` state *before* initiating the API call to save the score. This ensures the game-over overlay is rendered immediately, allowing the loading spinner to display correctly.
