import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { minikitConfig } from '@/minikit.config';

export const runtime = 'edge';

export async function generateMetadata({ searchParams }: any): Promise<Metadata> {
  const getParam = (param: string | string[] | undefined) => Array.isArray(param) ? param[0] : param;

  const fid = getParam(searchParams.fid);

  if (!fid) {
    console.warn("Warning: FID is missing from the share frame URL.");
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || '';
  
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const paramValue = getParam(value as string | string[]);
    if (paramValue) {
      params.append(key, paramValue);
    }
  }

  const frameImageUrl = `${appUrl}/api/frame-image/leaderboard?${params.toString()}`;

  console.log("Generated leaderboard frameImageUrl:", frameImageUrl);

  const fcFrameContent = JSON.stringify({
    version: minikitConfig.frame.version,
    imageUrl: frameImageUrl,
    button: {
      title: `Let's gooo, blast some ENBs!`,
      action: {
        name: `Launch ${minikitConfig.frame.name}`,
        type: "launch_frame",
      },
    },
  });

  return {
    title: `${minikitConfig.frame.name} - Weekly Recap`,
    description: minikitConfig.frame.description,
    other: {
      "fc:frame": fcFrameContent,
    },
  };
}

export default function ShareLeaderboardFramePage() {
  redirect('/onboarding/welcome');
}
