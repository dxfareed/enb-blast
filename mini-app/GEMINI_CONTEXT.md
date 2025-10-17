This document outlines the debugging and feature implementation process for the ENB Blast game.

### 1. Zero Score Bug

**Problem:** Users reported that their final score was always zero, regardless of their in-game performance.

**Debugging Process:**

1.  **Initial Hypothesis:** Suspected a mismatch between client-side and server-side game duration settings, causing the server's security checks to invalidate sessions.
2.  **Troubleshooting:**
    *   Adjusted the server's `GAME_DURATION_SECONDS` and `GRACE_PERIOD_SECONDS` to be more lenient. This did not resolve the issue.
    *   Added extensive `console.log` statements to both the client (`app/dashboard/game/page.tsx`) and the server (`app/api/game/end/route.ts`) to trace the entire data flow.
3.  **Root Cause Analysis:** The server logs revealed the true issue: a `PrismaClientValidationError` was occurring. The code was attempting to increment a `gamesPlayed` field in the `User` model, but this field did not exist in the `prisma/schema.prisma` file.
4.  **Resolution:** Removed the line of code that tried to update the non-existent `gamesPlayed` field. This resolved the database error and allowed scores to be saved correctly.

### 2. Daily Streak Feature

**Requirement:** Implement a daily streak that increments when a user plays the game on consecutive days.

**Implementation Process:**

1.  **Initial (Flawed) Logic:** The first implementation was based on a strict 24-hour rolling window. Logs showed this was not user-friendly for testing or for users who play multiple times a day, as the streak would only update once every 24 hours.
2.  **Improved Logic:** Refined the feature to use a calendar-based approach, resetting at 00:00 UTC.
    *   The server now compares the UTC date of the user's last completed game with the current UTC date.
    *   If the current game is on the next consecutive calendar day, the streak is incremented.
    *   If a calendar day is missed, the streak is reset to 1.
    *   Playing multiple times on the same UTC day does not affect the streak after the first game of the day.
3.  **Security:** The streak calculation is performed entirely on the server based on trusted, timestamped data from the database, making it secure from client-side manipulation.

### 3. UI Enhancement

**Requirement:** Add a "Did You Know" component to the "Saving score..." screen to provide engaging content while the user waits.

**Implementation:**

*   Modified `app/components/GameEngine.tsx`.
*   Added the `<DidYouKnow facts={BASE_BLOCKCHAIN_FACTS} />` component inside the conditional block that renders when the `isEndingGame` state is true. This mirrors the existing implementation on the "Starting game..." screen.
