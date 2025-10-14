import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';

const MAX_SCORE_PER_SECOND = 20; // Adjust this value based on your game's mechanics
const GAME_DURATION_SECONDS = 40;
const GRACE_PERIOD_SECONDS = 5; // Allow for some network latency

const client = createClient();

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

    const { sessionId, score } = await req.json();

    if (!sessionId || typeof score !== 'number') {
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

    if (durationSeconds > GAME_DURATION_SECONDS + GRACE_PERIOD_SECONDS) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'TIMED_OUT', endTime, score },
      });
      return NextResponse.json({ message: 'Game session timed out' }, { status: 408 });
    }

    const maxPossibleScore = durationSeconds * MAX_SCORE_PER_SECOND;
    if (score > maxPossibleScore) {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'INVALID_SCORE', score, endTime },
      });
      return NextResponse.json({ message: 'Score is too high for the session duration' }, { status: 400 });
    }

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        score,
        endTime,
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({ message: 'Game session completed' }, { status: 200 });
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error('Failed to end game session:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
