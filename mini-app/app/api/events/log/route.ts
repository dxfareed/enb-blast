import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Errors, createClient } from "@farcaster/quick-auth";

const client = createClient();

function getUrlHost(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        return url.host;
      } catch (error) {
        console.warn("Invalid origin header:", origin, error);
      }
    }
    const host = request.headers.get("host");
    if (host) return host;
    
    let urlValue = process.env.VERCEL_ENV === "production" 
      ? process.env.NEXT_PUBLIC_URL!
      : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
      
    return new URL(urlValue).host;
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
            return new NextResponse('Event type is required', { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { fid: BigInt(fid) } });
        if (!user) {
            return new NextResponse('User not found', { status: 404 });
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
        console.error("Failed to log event:", error);
        return new NextResponse('Error logging event', { status: 500 });
    }
}