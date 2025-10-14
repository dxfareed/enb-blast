# Task Verification System Documentation

This document outlines the architecture and process for verifying user tasks within the application.

## Overview

The task system is designed to reward users with points for completing specific actions. The verification process is handled on the backend to ensure security and reliability. Each task is defined in the database and has a corresponding verification function in the API.

---

## System Components

The system consists of three main parts:

### 1. Database (`prisma/schema.prisma`)

The database schema defines the structure for tasks and their completions.

-   **`Task` Model:** Represents a task that a user can complete.
    -   `id`: Unique identifier.
    -   `title`, `description`: UI text.
    -   `rewardPoints`: Points awarded upon completion.
    -   `type`: `DEFAULT`, `DAILY`, or `PARTNER`. Daily tasks can be completed once every 24-hour UTC period.
    -   `checkKey`: A **unique string identifier** that links the task in the database to its verification logic in the code. This is the most critical field.
    -   `expiresAt`: Optional expiration date for the task.

-   **`UserTaskCompletion` Model:** A join table that records when a user has completed a task, preventing duplicate rewards.

### 2. Verification Logic (`app/api/tasks/verify/route.ts`)

This file contains the core logic for checking if a task has been completed.

-   **`taskCheckers` Object:** A large object that acts as a map.
    -   **Keys:** The `checkKey` string from the `Task` model in the database.
    -   **Values:** An `async` function that takes a `user` object as an argument and returns a `Promise<boolean>`. `true` if the task is completed, `false` otherwise.

### 3. API Endpoint (`POST /api/tasks/verify`)

This is the public-facing endpoint that the frontend calls to initiate a task verification.

-   **Request Body:** `{ "checkKey": "THE_UNIQUE_CHECK_KEY" }`
-   **Authentication:** It uses a Farcaster quick auth JWT to identify and authenticate the user.

---

## How Verification Works (Step-by-Step)

1.  **Task Creation:** A new task is added to the `Task` table in the database. A unique `checkKey` is assigned (e.g., `FARCASTER_FOLLOW_ENB`).

2.  **Frontend Request:** The user clicks a "Verify" button in the app. The frontend sends a `POST` request to `/api/tasks/verify` with the corresponding `checkKey`.

3.  **Authentication:** The API endpoint verifies the user's JWT and retrieves their profile from the database using their FID.

4.  **Check for Prior Completion:** The system queries the `UserTaskCompletion` table to see if the user has already completed this task. For `DAILY` tasks, it checks for completions since the start of the current UTC day. If already completed, it returns a `409 Conflict` error.

5.  **Execute Checker Function:** The API uses the `checkKey` from the request body to find the matching verification function in the `taskCheckers` object.

6.  **Perform Verification:** The corresponding function is executed. This function might:
    -   Call an external API (e.g., Neynar API to check for a Farcaster follow).
    -   Query the application's own database (e.g., check if the user has played a game today).
    -   Read data from a smart contract on the blockchain (e.g., check NFT or token balance).

7.  **Award Points:** If the checker function returns `true`, the system:
    -   Creates a new record in the `UserTaskCompletion` table.
    -   Updates the user's `totalPoints` and `weeklyPoints` in the `User` table.
    -   Returns a `200 OK` response to the frontend.

8.  **Handle Failure:** If the checker function returns `false` or an error occurs, a `400 Bad Request` or `500 Internal Server Error` is returned, and no points are awarded.

---

## How to Add a New Task

Adding a new task is a two-step process.

### Step 1: Define the Task in the Database

First, add a new entry to the `Task` table. You can do this directly in the database or by adding it to the `prisma/seed.mjs` file and re-seeding.

**Crucially, you must define a new, unique `checkKey`.** Use a descriptive, `SCREAMING_SNAKE_CASE` convention.

*Example:*

```javascript
// In prisma/seed.mjs
const newTask = await prisma.task.create({
  data: {
    title: "Recast our Launch Cast",
    description: "Find our launch cast on Warpcast and hit the recast button.",
    rewardPoints: 250,
    type: 'DEFAULT',
    checkKey: 'WARPCAST_RECAST_LAUNCH', // Your new, unique key
    actionUrl: 'https://warpcast.com/~/casts/0x123456789...',
  },
});
```

### Step 2: Implement the Checker Function

In `app/api/tasks/verify/route.ts`, add a new entry to the `taskCheckers` object. The key **must** match the `checkKey` you defined in the database.

*Example:*

```javascript
// In app/api/tasks/verify/route.ts

const taskCheckers = {
  // ... existing checkers

  WARPCAST_RECAST_LAUNCH: async (user: { fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const LAUNCH_CAST_HASH = '0x123456789...'; // The hash of the cast to check

    if (!NEYNAR_API_KEY) {
      console.error("Missing Neynar API key");
      return false;
    }

    // Use the Neynar API to see if the user has recasted the specific cast
    const url = `https://api.neynar.com/v2/farcaster/cast/recasters?identifier=${LAUNCH_CAST_HASH}&identifier_type=hash&viewer_fid=${user.fid}`;

    try {
      const response = await fetch(url, { headers: { 'x-api-key': NEYNAR_API_KEY } });
      if (!response.ok) return false;
      const data = await response.json();
      // Check if the user's FID is in the list of recasters
      return data.users.some((recaster: any) => recaster.fid === user.fid);
    } catch (error) {
      console.error("Failed to verify recast:", error);
      return false;
    }
  },

  // ... other checkers
};
```

Once these two steps are done, the task is live. The frontend can now use the `WARPCAST_RECAST_LAUNCH` checkKey to verify this new task.

---

## Current `checkKey`s and Logic

-   `MEMBERSHIP_BASED`: Checks if user has at least "Based" level NFT.
-   `MEMBERSHIP_SUPERBASED`: Checks if user has at least "SuperBased" level NFT.
-   `MEMBERSHIP_LEGENDARY`: Checks if user has "Legendary" level NFT.
-   `FARCASTER_FOLLOW_ENB_CHANNEL`: Checks if user follows the `/enb` channel on Warpcast.
-   `FARCASTER_FOLLOW_DXFAREED`: Checks if user follows @dxfareed on Warpcast.
-   `FARCASTER_FOLLOW_KOKOCODES`: Checks if user follows @kokocodes on Warpcast.
-   `FARCASTER_FOLLOW_ENB`: Checks if user follows @enb on Warpcast.
-   `GAME_PLAYED`: Checks if the user has claimed tokens today (same as `TOKEN_CLAIMED`).
-   `TOKEN_CLAIMED`: Checks if a `Claim` record exists for the user for the current UTC day.
-   `USE_MULTIPLIER`: Checks if the user's `lastMultiplierUsedAt` is today.
-   `LEADERBOARD_VISIT`: Checks if a `UserEvent` of type `LEADERBOARD_VISIT` exists for the user for the current UTC day.
-   `MAX_OUT_DAILY_CLAIMS`: Reads from the game contract to see if `claimsInCurrentCycle` is equal to or greater than `maxClaimsPerCycle`.
-   `MINT_ENB_BOUNTY_NFT`: Checks if the user holds at least one ENB Bounty NFT.
-   `HOLD_100K_ENB`: Checks if the user's wallet holds at least 100,000 $ENB tokens.
-   `HOLD_500K_ENB`: Checks if the user's wallet holds at least 500,000 $ENB tokens.
-   `HOLD_1M_ENB`: Checks if the user's wallet holds at least 1,000,000 $ENB tokens.
-   `TELEGRAM_JOIN`, `MINI_APP_OPEN_MINING`, `MINI_APP_OPEN_BOUNTY`, `PARTNER_SPECIAL_EVENT`: Currently dummy implementations that return `true`.
