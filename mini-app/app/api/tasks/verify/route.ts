import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { Errors, createClient } from "@farcaster/quick-auth";

class EasterEggError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EasterEggError';
  }
}

function getStartOfUTCDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

import {
  TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
  TOKEN_MEMBERSHIP_CONTRACT_ABI,
  GAME_CONTRACT_ADDRESS,
  GAME_CONTRACT_ABI,
} from '@/app/utils/constants';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

async function checkAndSyncMembershipLevel(user: { id: string; walletAddress: string; }): Promise<number> {
  try {
    const data = await publicClient.readContract({
      address: TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
      abi: TOKEN_MEMBERSHIP_CONTRACT_ABI,
      functionName: 'userAccounts',
      args: [user.walletAddress],
    });

    const membershipLevel = Number((data as any)[4]);

    await prisma.user.update({
      where: { id: user.id },
      data: { level: membershipLevel },
    });

    return membershipLevel;

  } catch (error) {
    console.error("Failed to check or sync membership level:", error);
    // Return a default/low level on failure to prevent accidental task completion
    return -1;
  }
}

const taskCheckers = {
  MEMBERSHIP_BASED: async (user: { id: string; walletAddress: string; }) => {
    const level = await checkAndSyncMembershipLevel(user);
    return level >= 0;
  },
  MEMBERSHIP_SUPERBASED: async (user: { id: string; walletAddress: string; }) => {
    const level = await checkAndSyncMembershipLevel(user);
    return level >= 1;
  },
  MEMBERSHIP_LEGENDARY: async (user: { id: string; walletAddress: string; }) => {
    const level = await checkAndSyncMembershipLevel(user);
    return level >= 2;
  },
  WARPCAST_FOLLOW: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const FARCASTER_CHANNEL_ID = process.env.FARCASTER_CHANNEL_ID || "enb";

    if (!NEYNAR_API_KEY || !FARCASTER_CHANNEL_ID) {
      console.error("Missing Neynar API key or Farcaster channel ID");
      return false;
    }

    const url = `https://api.neynar.com/v2/farcaster/channel/member/list/?channel_id=${FARCASTER_CHANNEL_ID}&fid=${user.fid}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const data = await response.json();
      return data.members.length > 0;
    } catch (error) {
      console.error("Failed to verify Warpcast follow:", error);
      throw error;
    }
  },

  FARCASTER_FOLLOW_ENB_CHANNEL: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const FARCASTER_CHANNEL_ID = "enb";

    if (!NEYNAR_API_KEY) {
      console.error("Missing Neynar API key");
      return false;
    }

    const url = `https://api.neynar.com/v2/farcaster/channel/?id=${FARCASTER_CHANNEL_ID}&viewer_fid=${user.fid}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const data = await response.json();
      return data.channel.viewer_context.following;
    } catch (error) {
      console.error("Failed to verify Farcaster channel follow:", error);
      throw error;
    }
  },

  FARCASTER_FOLLOW_DXFAREED: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const DXFAREED_FID = 849768;

    if (user.fid === BigInt(DXFAREED_FID)) {
      throw new EasterEggError('what are you doing ??');
    }

    if (!NEYNAR_API_KEY) {
      console.error("Missing Neynar API key");
      return false;
    }

    const url = `https://hub-api.neynar.com/v1/linkById?fid=${user.fid}&target_fid=${DXFAREED_FID}&link_type=follow`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const text = await response.text();
      if (!text) {
        return false;
      }

      const data = JSON.parse(text);
      return !!data.data && !data.error;

    } catch (error) {
      console.error("Failed to verify Farcaster follow:", error);
      return false;
    }
  },

  FARCASTER_FOLLOW_KOKOCODES: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const KOKOCODES_FID = 738574;

    if (user.fid === BigInt(KOKOCODES_FID)) {
      throw new EasterEggError('what are you doing ??');
    }

    if (!NEYNAR_API_KEY) {
      console.error("Missing Neynar API key");
      return false;
    }

    const url = `https://hub-api.neynar.com/v1/linkById?fid=${user.fid}&target_fid=${KOKOCODES_FID}&link_type=follow`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const text = await response.text();
      if (!text) {
        return false;
      }

      const data = JSON.parse(text);
      return !!data.data && !data.error;

    } catch (error) {
      console.error("Failed to verify Farcaster follow:", error);
      return false;
    }
  },

  FARCASTER_FOLLOW_ENB: async (user: { id: string; fid: bigint; }): Promise<boolean> => {
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
    const ENB_FID = 1089736;

    if (user.fid === BigInt(ENB_FID)) {
      throw new EasterEggError('what are you doing ??');
    }

    if (!NEYNAR_API_KEY) {
      console.error("Missing Neynar API key");
      return false;
    }

    const url = `https://hub-api.neynar.com/v1/linkById?fid=${user.fid}&target_fid=${ENB_FID}&link_type=follow`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': NEYNAR_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Neynar API request failed with status ${response.status}`);
        return false;
      }

      const text = await response.text();
      if (!text) {
        return false;
      }

      const data = JSON.parse(text);
      return !!data.data && !data.error;

    } catch (error) {
      console.error("Failed to verify Farcaster follow:", error);
      return false;
    }
  },

  TELEGRAM_JOIN: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying Telegram join for user ${user.id}...`);
    return true; // Dummy implementation
  },

  GAME_PLAYED: async (user: { id: string; }): Promise<boolean> => {
    return taskCheckers.TOKEN_CLAIMED(user);
  },

  TOKEN_CLAIMED: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying token claim for user ${user.id}...`);
    const todayUTC = getStartOfUTCDay();
    const recentClaim = await prisma.claim.findFirst({
      where: {
        userId: user.id,
        timestamp: { gte: todayUTC },
      },
    });
    return !!recentClaim;
  },
  USE_MULTIPLIER: async (user: { id: string; }): Promise<boolean> => {
    const todayUTC = getStartOfUTCDay();
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastMultiplierUsedAt: true },
    });

    if (!userProfile || !userProfile.lastMultiplierUsedAt) {
      return false;
    }

    return userProfile.lastMultiplierUsedAt >= todayUTC;
  },

  LEADERBOARD_VISIT: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying leaderboard visit for user ${user.id}...`);
    const todayUTC = getStartOfUTCDay();
    const visitEvent = await prisma.userEvent.findFirst({
      where: {
        userId: user.id,
        type: 'LEADERBOARD_VISIT',
        createdAt: { gte: todayUTC },
      },
    });
    return !!visitEvent;
  },

  MAX_OUT_DAILY_CLAIMS: async (user: { fid: bigint; }) => {
    try {
      const [onChainProfile, maxClaims] = await Promise.all([
        publicClient.readContract({
          //@ts-ignore
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getUserProfile',
            args: [user.fid]
        }),
        publicClient.readContract({
          //@ts-ignore  
          address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'maxClaimsPerCycle',
        })
      ]);

      if (!onChainProfile.isRegistered) {
        return false;
      }

      return onChainProfile.claimsInCurrentCycle >= maxClaims;
    } catch (error) {
      console.error("Failed to check max daily claims:", error);
      return false;
    }
  },

  MINT_ENB_BOUNTY_NFT: async (user: { walletAddress: string; }) => checkNftBalance(user.walletAddress),
  HOLD_100K_ENB: async (user: { walletAddress: string; }) => checkTokenBalance(user.walletAddress, 100000),
  HOLD_500K_ENB: async (user: { walletAddress: string; }) => checkTokenBalance(user.walletAddress, 500000),
  HOLD_1M_ENB: async (user: { walletAddress: string; }) => checkTokenBalance(user.walletAddress, 1000000),
  MINI_APP_OPEN_MINING: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying Mini App open (Mining) for user ${user.id}...`);
    return true;
  },
  MINI_APP_OPEN_BOUNTY: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying Mini App open (Bounty) for user ${user.id}...`);
    return true;
  },
  PARTNER_SPECIAL_EVENT: async (user: { id: string; }): Promise<boolean> => {
    console.log(`Verifying Partner Special Event for user ${user.id}...`);
    return true;
  },
};

const ENB_BOUNTY_NFT_CONTRACT_ADDRESS = '0xf0b03a35c4fc40395fd0db8f3661240534d22a00';
const ENB_BOUNTY_NFT_CONTRACT_ABI = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;


async function checkNftBalance(walletAddress: string): Promise<boolean> {
    if (!walletAddress) return false;
    try {
        const balance = await publicClient.readContract({
            address: ENB_BOUNTY_NFT_CONTRACT_ADDRESS,
            abi: ENB_BOUNTY_NFT_CONTRACT_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
        });

        return Number(balance) > 0;
    } catch (error) {
        console.error("Failed to check NFT balance:", error);
        return false;
    }
}

async function checkTokenBalance(walletAddress: string, requiredBalance: number): Promise<boolean> {
  const TOKEN_CONTRACT_ADDRESS = '0xf73978b3a7d1d4974abae11f696c1b4408c027a0';
  const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL;

  if (!BASE_MAINNET_RPC_URL) {
    console.error('Missing BASE_MAINNET_RPC_URL');
    return false;
  }

  try {
    const response = await fetch(BASE_MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: TOKEN_CONTRACT_ADDRESS,
          data: `0x70a08231000000000000000000000000${walletAddress.substring(2)}`
        }, 'latest']
      })
    });

    if (!response.ok) {
      console.error(`RPC request failed with status ${response.status}`);
      return false;
    }

    const data = await response.json();
    if (data.error) {
      console.error('RPC error:', data.error);
      return false;
    }

    const balance = parseInt(data.result, 16) / 1e18;
    return balance >= requiredBalance;
  } catch (error) {
    console.error('Failed to check token balance:', error);
    return false;
  }
}

const client = createClient();

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
    const { checkKey } = await request.json();

    if (!checkKey) {
      return new NextResponse('Task checkKey is required', { status: 400 });
    }

    const [user, task] = await Promise.all([
      prisma.user.findUnique({ where: { fid: BigInt(fid) } }),
      prisma.task.findUnique({ where: { checkKey } }),
    ]);

    if (!user) return new NextResponse('User not found', { status: 404 });
    if (!task) return new NextResponse('Task not found', { status: 404 });

    const todayUTC = getStartOfUTCDay();
    const existingCompletion = await prisma.userTaskCompletion.findFirst({
      where: {
        userId: user.id,
        taskId: task.id,
        ...(task.type === 'DAILY' && { completedAt: { gte: todayUTC } }),
      },
    });

    if (existingCompletion) {
      return NextResponse.json({ message: 'Task already completed' }, { status: 409 });
    }

    const checker = taskCheckers[checkKey as keyof typeof taskCheckers];
    if (!checker) throw new Error(`No checker found for task: ${checkKey}`);

    const isVerified = await checker(user);

    if (!isVerified) {
      return NextResponse.json({ message: 'Task verification failed. Please try again.' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.userTaskCompletion.create({
        data: { userId: user.id, taskId: task.id },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          totalPoints: { increment: task.rewardPoints },
          weeklyPoints: { increment: task.rewardPoints },
        },
      }),
    ]);

    return NextResponse.json({ message: 'Task verified and points awarded!' });

  } catch (error) {
    if (error instanceof EasterEggError) {
      return NextResponse.json({ message: error.message }, { status: 418 });
    }
    if (error instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
      return NextResponse.json({ message: 'server error, try again' }, { status: 500 });
    }
    console.error("Failed to verify task:", error);
    return new NextResponse('Error verifying task', { status: 500 });
  }
}