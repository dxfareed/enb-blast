import { Metadata } from 'next';
import { minikitConfig } from '@/minikit.config';

export const runtime = 'edge'; // Add runtime declaration

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const getParam = (param: string | string[] | undefined) => Array.isArray(param) ? param[0] : param;

  const score = getParam(searchParams.score) || '0';
  const username = getParam(searchParams.username) || '@johndoe';
  const pfpUrl = getParam(searchParams.pfpUrl) || 'https://pbs.twimg.com/profile_images/1734354549496836096/-laoU9C9_400x400.jpg';
  const streak = getParam(searchParams.streak) || '0';
  const claimed = getParam(searchParams.claimed) || '0';
  const weeklyPoints = getParam(searchParams.weeklyPoints) || '0';
  const rank = getParam(searchParams.rank) || 'N/A';

  const appUrl = process.env.NEXT_PUBLIC_URL || '';
  const frameImageUrl = `${appUrl}/api/frame-image?score=${score}&username=${username}&pfpUrl=${pfpUrl}&streak=${streak}&claimed=${claimed}&weeklyPoints=${weeklyPoints}&rank=${rank}`;

  console.log("Generated frameImageUrl:", frameImageUrl);
  const fcFrameContent = JSON.stringify({
    version: minikitConfig.frame.version,
    imageUrl: frameImageUrl,
    button: {
      title: `blast ENBs`,
      action: {
        name: `Launch ${minikitConfig.frame.name}`,
        type: "launch_frame",
      },
    },
  });
  console.log("Generated fc:frame content:", fcFrameContent);

  return {
    title: minikitConfig.frame.name,
    description: minikitConfig.frame.description,
    other: {
      "fc:frame": fcFrameContent,
    },
  };
} // Closing brace for generateMetadata function

export default function ShareFramePage() {
  return (
    <div>
      <h1>Share this frame on Farcaster!</h1>
      <p>This page generates the Farcaster Frame dynamically.</p>
    </div>
  );
}


