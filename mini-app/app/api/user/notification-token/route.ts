import { NextResponse, NextRequest } from 'next/server';
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
  if (host) {
    return host;
  }

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
    return NextResponse.json({ message: "Missing authorization token" }, { status: 401 });
  }

  try {
    const { notificationToken } = await request.json();
    if (!notificationToken) {
      return NextResponse.json({ error: 'Missing notificationToken' }, { status: 400 });
    }

    const payload = await client.verifyJwt({
      token: authorization.split(" ")[1] as string,
      domain: getUrlHost(request),
    });
    const fid = payload.sub;

    const user = await prisma.user.findUnique({ where: { fid: BigInt(fid) } });
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { fid: BigInt(fid) },
      //@ts-ignore
      data: { notificationToken: JSON.stringify(notificationToken) },
    });

    return NextResponse.json({ message: 'Notification token updated successfully' });
  } catch (error) {
    if (error instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid authorization token" }, { status: 401 });
    }
    console.error('Error updating notification token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
