import prisma from './prisma';

type Checker = (fid: bigint) => Promise<boolean>;

const checkers: Record<string, Checker> = {
  has_played_a_round: async (fid) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const airdropClaim = await prisma.claim.findFirst({
      where: {
        user: {
          fid,
        },
        timestamp: {
          gte: today,
        },
      },
    });
    return !!airdropClaim;
  },
  HIGH_SCORE_500_PLUS: async (fid) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const gameSession = await prisma.gameSession.findFirst({
      where: {
        user: {
          fid,
        },
        endTime: {
          gte: today,
        },
        score: {
          gte: 500,
        },
        status: 'COMPLETED',
      },
    });
    return !!gameSession;
  },
  has_visited_leaderboard: async (fid) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visit = await prisma.userEvent.findFirst({
      where: {
        user: {
          fid,
        },
        type: 'LEADERBOARD_VISIT',
        createdAt: {
          gte: today,
        },
      },
    });
    return !!visit;
  },
  HAS_USED_POWERUP: async (fid) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await prisma.user.findUnique({
      where: {
        fid,
      },
    });

    if (!user || !user.powerupExpiration) {
      return false;
    }

    return user.powerupExpiration >= today;
  },
};

export const checkTask = async (
  fid: bigint,
  checkKey: string,
): Promise<boolean> => {
  const checker = checkers[checkKey];
  if (!checker) {
    console.error(`No checker found for key: ${checkKey}`);
    return false;
  }
  return checker(fid);
};