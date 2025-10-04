import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient, Errors } from '@farcaster/quick-auth';

const client = createClient();

function getUrlHost(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin) { try { return new URL(origin).host; } catch (e) { console.warn("Invalid origin:", e); } }
    const host = request.headers.get("host");
    if (host) { return host; }
    const vercelUrl = process.env.VERCEL_URL;
    const urlValue = process.env.VERCEL_ENV === "production" ? process.env.NEXT_PUBLIC_URL! : vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
    return new URL(urlValue).host;
}

export async function POST(req: NextRequest) {
 // console.log('DEBUG: Prisma User Model Fields:', Object.keys(Prisma.dmmf.datamodel.models.find(m => m.name === 'User')?.fields.reduce((acc, f) => ({ ...acc, [f.name]: f.type }), {}) || {}));
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1] as string;
  try {
    const payload = await client.verifyJwt({
        token: token,
        domain: getUrlHost(req),
    });
    const fid = payload.sub;

    if (!fid) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { fid },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    //@ts-ignore
    if (user.lastMultiplierUsedAt) {
      //@ts-ignore
      const lastUsedDate = new Date(user.lastMultiplierUsedAt);
      if (
      lastUsedDate.getUTCFullYear() === now.getUTCFullYear() &&
      lastUsedDate.getUTCMonth() === now.getUTCMonth() &&
      lastUsedDate.getUTCDate() === now.getUTCDate()
      ) {
      return NextResponse.json({ message: 'Multiplier already used today' }, { status: 429 });
      }
    }

    await prisma.user.update({
      where: { fid },
      //@ts-ignore
      data: { lastMultiplierUsedAt: now },
    });

    return NextResponse.json({ message: 'Multiplier activated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error activating multiplier:', error);
    if (error instanceof Errors.InvalidTokenError) {
        return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
