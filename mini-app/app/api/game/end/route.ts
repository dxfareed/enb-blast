import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';
import { isFidRestricted } from '@/lib/restricted-fids';

// Server-side authoritative values
const ITEM_VALUES = {
  picture: 5,
  powerup_point_2: 10,
  powerup_point_5: 15,
  powerup_point_10: 30,
  powerup_pumpkin: 500,
};

const GAME_DURATION_SECONDS = 30;
const GRACE_PERIOD_SECONDS = 20;
const MAX_EVENTS_PER_SECOND = 5; // Max items a user can plausibly collect per second

const client = createClient();

// Define types locally on the server to avoid dependency on client-side code
type ItemType = 'bomb' | 'picture' | 'powerup_point_2' | 'powerup_point_5' | 'powerup_point_10' | 'powerup_pumpkin';
type GameEvent = {
  type: 'collect';
  itemType: ItemType;
  timestamp: number;
} | {
  type: 'bomb_hit';
  timestamp: number;
};

function getUrlHost(request: NextRequest): string {
    const origin = request.headers.get("origin");
    if (origin) { try { return new URL(origin).host; } catch (e) { console.warn("Invalid origin:", e); } }
    const host = request.headers.get("host");
    if (host) { return host; }
    const vercelUrl = process.env.VERCEL_URL;
    const urlValue = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_URL! : vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
    return new URL(urlValue).host;
}

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Missing token" }, { status: 401 });
    }

    const payload = await client.verifyJwt({
        token: authorization.split(" ")[1] as string,
        domain: getUrlHost(req),
    });
    const fid = BigInt(payload.sub);

    if (isFidRestricted(Number(fid))) {
      return NextResponse.json({ message: 'User is restricted' }, { status: 403 });
    }

    const { sessionId, events } = await req.json();

    if (!sessionId || !Array.isArray(events)) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { fid } });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const session = await prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        status: 'IN_PROGRESS',
      },
    });

    if (!session) {
      return NextResponse.json({ message: 'Active game session not found' }, { status: 404 });
    }

    const startTime = new Date(session.startTime);
    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    // --- Security Check: Session Duration ---
    if (durationSeconds > GAME_DURATION_SECONDS + GRACE_PERIOD_SECONDS) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'TIMED_OUT', endTime, score: 0 }, // Score is 0 on timeout
      });
      // Return a specific score of 0 for timed out sessions
      return NextResponse.json({ score: 0, pumpkinsCollected: 0, message: 'Game session timed out' }, { status: 200 });
    }

    // --- Security Check: Event Rate ---
    const maxPossibleEvents = durationSeconds * MAX_EVENTS_PER_SECOND;
    if (events.length > maxPossibleEvents) {
        await prisma.gameSession.update({
            where: { id: sessionId },
            data: { status: 'INVALID_SCORE', score: 0, endTime },
        });
        return NextResponse.json({ message: 'Event count is too high for the session duration' }, { status: 400 });
    }

    // --- Secure Score Calculation ---
    let calculatedScore = 0;
    let pumpkinsCollected = 0;
    for (const event of events) {
        if (event.type === 'collect') {
            const itemValue = ITEM_VALUES[event.itemType as keyof typeof ITEM_VALUES];
            if (itemValue) {
                calculatedScore += itemValue;
                if (event.itemType === 'powerup_pumpkin') {
                    pumpkinsCollected += 1;
                }
            }
        } else if (event.type === 'bomb_hit') {
            // Apply the same penalty logic as the client
            calculatedScore = calculatedScore <= 100 
                ? Math.floor(calculatedScore * 0.5) 
                : Math.floor(calculatedScore * 0.4);
            // On bomb hit, the user loses all pumpkins collected *so far*
            pumpkinsCollected = 0;
        }
    }

    // --- Daily Streak Logic (Calendar-Based) ---
    const lastGameSession = await prisma.gameSession.findFirst({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        id: { not: sessionId }, // Exclude the current session
      },
      orderBy: {
        endTime: 'desc',
      },
    });

    let newStreak = user.streak;
    const currentDay = endTime.toISOString().split('T')[0];

    if (!lastGameSession?.endTime) {
      // First game ever for this user
      newStreak = 1;
    } else {
      const lastGameDay = lastGameSession.endTime.toISOString().split('T')[0];
      
      if (currentDay > lastGameDay) {
        // This is the first game on a new day.
        const lastGameDayDate = new Date(lastGameDay);
        lastGameDayDate.setUTCDate(lastGameDayDate.getUTCDate() + 1);
        const consecutiveDay = lastGameDayDate.toISOString().split('T')[0];

        if (currentDay === consecutiveDay) {
          newStreak = user.streak + 1; // Increment streak for consecutive days
        } else {
          newStreak = 1; // Reset streak if not consecutive
        }
      } else {
        // This is a subsequent game on the same day.
        // If the user's streak was 0, this play should make it 1.
        if (newStreak === 0) {
            newStreak = 1;
        }
      }
    }

    const isNewHighScore = calculatedScore > user.highScore;

    // Use a transaction to ensure both session and user are updated
    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          score: calculatedScore,
          endTime,
          status: 'COMPLETED',
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          weeklyPoints: { increment: calculatedScore },
          totalPoints: { increment: calculatedScore },
          streak: newStreak,
          highScore: isNewHighScore ? calculatedScore : user.highScore,
        },
      })
    ]);

    return NextResponse.json({ score: calculatedScore, pumpkinsCollected, isNewHighScore }, { status: 200 });
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error('Failed to end game session:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}