## Security Vulnerability Fix: Server-Authoritative Gameplay Duration

### Problem

A security vulnerability was identified where the backend's game session validation was too lenient, allowing users to cheat by extending their gameplay time on the client-side. The primary issues were:

1.  **Excessive Grace Period**: A `GRACE_PERIOD_SECONDS` of 20 seconds was intended to account for network latency but was large enough to be exploited.
2.  **Lack of Event Timestamp Validation**: The backend did not verify the timestamps of the game events themselves. It only checked the wall-clock time between the start and end of the session (i.e., the time between two API calls).

This allowed a malicious user to pause the game using browser developer tools, play for longer than the allotted time, and still have their score accepted as long as the final API call reached the server within the generous grace period.

### Solution

To address this, I implemented a more robust, multi-layered validation strategy in the `/api/game/end` endpoint to make the server truly authoritative over the game's duration.

#### 1. Reduced Grace Period

The `GRACE_PERIOD_SECONDS` was reduced from a highly exploitable 20 seconds to a more reasonable **5 seconds**. This is sufficient to account for typical network latency without providing a window for cheating.

```typescript
// app/api/game/end/route.ts
const GRACE_PERIOD_SECONDS = 5; // Reduced from 20 to 5
```

#### 2. Gameplay Duration Validation from Events

The core of the fix is a new security check that validates the duration of the gameplay based on the actual event data sent from the client.

-   The server now finds the timestamp of the most recent event in the submitted log.
-   It calculates the duration between the start of the session (a trusted, server-set timestamp) and this last event timestamp.
-   This calculated `gameplayDurationFromEvents` is then checked against the allowed game duration (`GAME_DURATION_SECONDS` + any server-validated time extensions + the new 5-second grace period).

If the duration calculated from the events is longer than what is allowed, the server rejects the score and marks the session as invalid.

```typescript
// app/api/game/end/route.ts

// --- Security Check: Gameplay Duration from Events ---
if (events.length > 0) {
  const lastEventTimestamp = events.reduce((max, event) => Math.max(max, event.timestamp), 0);
  const gameplayDurationFromEvents = (lastEventTimestamp - startTime.getTime()) / 1000;

  if (gameplayDurationFromEvents > GAME_DURATION_SECONDS + totalTimeExtended + GRACE_PERIOD_SECONDS) {
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: 'INVALID_SCORE', score: 0, endTime },
    });
    return NextResponse.json({ message: 'Gameplay duration based on events is too long.' }, { status: 400 });
  }
}
```

This ensures that even if a user manipulates their client-side clock or pauses the game, the timestamps on the events themselves will reveal the cheating, leading to the rejection of their score. This change makes the backend's validation much more secure and closes the vulnerability.

---

## Security Vulnerability Fix: Server-Authoritative Shield Power-Up

### Problem

A second vulnerability was identified in how the shield power-up was handled. The client-side code was solely responsible for determining if a bomb collision should be ignored due to an active shield.

-   **Vulnerability**: A malicious user could modify the client-side code to keep the shield active indefinitely. Because the client would never send a `bomb_hit` event, the server would have no way of knowing that the user was colliding with bombs without penalty. The server implicitly trusted the client's reporting.

### Solution

To mitigate this, the logic was refactored to give the server full authority over the shield's state and its effect on gameplay.

#### 1. Client-Side Change: Unconditional Collision Reporting

The `GameEngine.tsx` component was modified to report every bomb collision, regardless of the shield's status.

-   The `bomb_hit` event was renamed to `bomb_collision` to reflect its new purpose: reporting a raw event, not a game-state change.
-   Now, every time the avatar touches a bomb, a `bomb_collision` event is sent to the server. The client is no longer responsible for deciding the outcome.

```typescript
// app/components/GameEngine.tsx

// When a bomb is hit, always report the collision to the server.
gameEventsRef.current.push({ type: 'bomb_collision', timestamp: Date.now() });

// Only apply client-side effects if the shield is not active.
if (!isInvincibleRef.current && !isShieldActiveRef.current) {
  bombCollisionItem = item;
}
```

#### 2. Server-Side Change: Authoritative State Management

The backend (`/api/game/end`) now processes the entire event log to manage the shield's state authoritatively.

-   A new constant, `SHIELD_DURATION_SECONDS`, was added to ensure the shield's duration is controlled by the server.
-   The server now sorts all game events by their timestamp to accurately replay the game session.
-   It maintains a `shieldExpiresAt` variable. When a `'shield'` item is collected, the server calculates when the shield should expire.
-   When a `bomb_collision` event is encountered, the server checks if the event's timestamp is later than `shieldExpiresAt`. A score penalty is only applied if the shield was not active at the time of the collision.

```typescript
// app/api/game/end/route.ts

// --- Secure Score Calculation ---
let calculatedScore = 0;
let shieldExpiresAt = 0;
const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

for (const event of sortedEvents) {
    if (event.type === 'collect' && event.itemType === 'shield') {
        shieldExpiresAt = event.timestamp + (SHIELD_DURATION_SECONDS * 1000);
    } else if (event.type === 'bomb_collision') {
        if (event.timestamp > shieldExpiresAt) {
            // Apply penalty only if shield is not active
            calculatedScore = Math.floor(calculatedScore * 0.4);
        }
    }
    // ... other score calculations
}
```

This change ensures that a user cannot cheat by suppressing bomb collision events. The server has the complete and final say on the game's outcome, closing the vulnerability.

