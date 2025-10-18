# Agent Onboarding Guide: Game Engine

This document provides a summary of the current state of the `GameEngine.tsx` component to help onboard new agents quickly.

## Security Vulnerability & Proposed Solution (October 2025)

**A critical security vulnerability has been identified in the current implementation.**

-   **Problem**: The game logic, including score calculation, is handled entirely on the client-side. This means the frontend is the "source of truth" for the game's outcome.
-   **Vulnerability**: A malicious user can easily cheat by using browser developer tools to modify the game's state directly (e.g., `setScore(999999)`), altering the client-side code, or intercepting the final network request to send a fraudulent score to the backend.
-   **Conclusion**: The client cannot be trusted. The current system is not safe for a competitive or rewarding environment.

### Proposed Solution: Server-Authoritative Logic

To fix this, the backend must become the source of truth for all game outcomes.

1.  **Client-Side Responsibility**: The frontend's role will be to collect a detailed log of all game events (`collect`, `bomb_hit`, `time_extend`, etc.) without calculating the score itself. The `gameEventsRef` is already implemented for this purpose.
2.  **Backend Responsibility**: At the end of a game, the client will send the entire event log to a secure backend endpoint. The server will then:
    -   **Validate the log**: Replay the game session on the server using the event log to check for cheating (e.g., impossible timings, invalid actions).
    -   **Calculate the score**: Securely calculate the final score based on the validated events and its own trusted game logic.
    -   **Save the score**: Persist the server-verified score to the database.

This approach ensures that cheating on the client-side is ineffective, as the server makes the final, authoritative decision on the game's outcome.

---

## Recent Bug Fixes (October 2025)

Two critical bugs related to the time-booster power-up were identified and resolved.

### 1. Time Booster Double-Count Fix

-   **Problem**: Collecting a single time-booster item was incorrectly adding 20 seconds to the timer instead of the intended 10 seconds.
-   **Root Cause**: A race condition in the game loop's collision detection. The logic was processing the same item twice before it could be removed from the game state.
-   **Solution**: The collision logic was refactored to use a `Set` to track the IDs of items collected within a single frame. This ensures that each collectible is processed exactly once, guaranteeing the correct 10-second time extension.

### 2. Game Slowdown on Time Boost Fix

-   **Problem**: Collecting a time booster caused the game's difficulty (item spawn rate and speed) to decrease, effectively slowing the game down.
-   **Root Cause**: The game's difficulty progression was incorrectly tied to the `timeLeft` state. Increasing `timeLeft` made the game think less time had passed, so it reverted to an easier difficulty level.
-   **Solution**: The difficulty calculation was decoupled from `timeLeft`. A `gameStartTimeRef` was introduced to record the timestamp when the game begins. The difficulty is now calculated based on the *true* elapsed time (`Date.now() - gameStartTimeRef.current`), ensuring the challenge ramps up consistently and is unaffected by time-extending power-ups.

---

## Last Major Feature: Magnet Power-Up

The most recent feature implemented was the **Magnet Power-Up**. This feature introduces a new collectible item that, when collected, attracts other nearby items (except bombs) towards the player's avatar for a limited time.

### Key Implementation Details:

-   **File Modified**: All changes were contained within `app/components/GameEngine.tsx`.
-   **Core Logic**:
    1.  **New Item Type**: A `magnet` item was added, with associated constants for its image (`/magnet.jpg`), spawn chance, and duration.
    2.  **State Management**:
        -   `isMagnetActive` (boolean state) tracks if the power-up is active.
        -   `magnetTimerRef` (useRef) manages the `setTimeout` for the magnet's duration to prevent memory leaks.
    3.  **Attraction Mechanic**:
        -   The main `gameLoop` (`requestAnimationFrame`) now checks if the magnet is active.
        -   If active, it calculates the vector between each item and the avatar, applying a "pull" force to attract non-bomb items.
    4.  **Stale State Prevention**:
        -   To ensure the high-frequency `gameLoop` always has the latest data, `isMagnetActive` and `avatarPosition` states are mirrored into `useRef`s (`isMagnetActiveRef`, `avatarPositionRef`). The game loop reads from these refs to prevent using stale state.
    5.  **Visual Indicator**: A 🧲 emoji is rendered next to the avatar when the magnet is active.
-   **Memory Leak Prevention**: The `useEffect` hook that runs the game loop now includes cleanup logic to clear the magnet's `setTimeout` when the component unmounts or the game ends.

This implementation is complete, tested, and memory-safe. Any new work on the game engine should take this existing functionality into account.
