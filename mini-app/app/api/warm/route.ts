// warm up the database connection, running a serverless database

import prisma from '../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ status: 'ok', message: 'Database is warm.' }, { status: 200 });
  } catch (error) {
    console.error("Warm-up failed:", error);
    return NextResponse.json({ status: 'error', message: 'Failed to warm up database.' }, { status: 500 });
  }
}