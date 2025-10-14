import { NextRequest, NextResponse } from 'next/server';
import { Errors, createClient } from "@farcaster/quick-auth";
import prisma from '@/lib/prisma';

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

    const user = await prisma.user.findUnique({
      where: { fid },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Deactivate any existing active sessions for the user
    await prisma.gameSession.updateMany({
      where: {
        userId: user.id,
        status: 'IN_PROGRESS',
      },
      data: {
        status: 'ABANDONED',
      },
    });

    const newSession = await prisma.gameSession.create({
      data: {
        userId: user.id,
      },
    });

    return NextResponse.json({ sessionId: newSession.id }, { status: 200 });
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error('Failed to start game session:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
