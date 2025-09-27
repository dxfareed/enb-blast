import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Errors, createClient } from "@farcaster/quick-auth";

const client = createClient({
  fetch: (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timeout));
  }
});

function getUrlHost(request: NextRequest) {
    // First try to get the origin from the Origin header
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        return url.host;
      } catch (error) {
        console.warn("Invalid origin header:", origin, error);
      }
    }
  
    // Fallback to Host header
    const host = request.headers.get("host");
    if (host) {
      return host;
    }
  
    // Final fallback to environment variables
    let urlValue: string;
    if (process.env.VERCEL_ENV === "production") {
      urlValue = process.env.NEXT_PUBLIC_URL!;
    } else if (process.env.VERCEL_URL) {
      urlValue = `https://${process.env.VERCEL_URL}`;
    } else {
      urlValue = "http://localhost:3000";
    }
  
    const url = new URL(urlValue);
    return url.host;
  }

export async function POST(request: NextRequest) {
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
        return NextResponse.json({ message: "Missing token" }, { status: 401 });
    }

  try {
    const payload = await client.verifyJwt({
        token: authorization.split(" ")[1] as string,
        domain: getUrlHost(request),
    });
    const fid = payload.sub;
    const { eventType } = await request.json();

    if (!eventType) {
        return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { fid: BigInt(fid) },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.userEvent.create({
      data: {
        userId: user.id,
        type: eventType,
      },
    });

    return NextResponse.json({ message: 'Event logged successfully' });

  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    console.error('Failed to log event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
