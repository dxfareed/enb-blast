// This is your user stats frame route, e.g., /app/share-frame/route.ts
import { formatPoints } from '@/app/utils/format';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// --- FONT LOADING ---
// Fetch the font file ONCE when the module is loaded.
const spaceMonoRegularFontPromise = fetch(
  new URL('/SpaceMono-Regular.ttf', process.env.NEXT_PUBLIC_URL as string)
).then((res) => res.arrayBuffer());


// --- DATA TYPES ---
type UserProfile = {
  username: string;
  pfpUrl: string;
  streak: number;
  totalClaimed: string;
  weeklyPoints: string;
  weeklyRank: number;
};

type LeaderboardUser = {
  fid: string;
  username: string;
  pfpUrl: string;
};

// --- DATA FETCHING ---
async function getUserProfile(fid: string, revalidate = false): Promise<UserProfile> {
  const fallbackUser: UserProfile = {
    username: 'player',
    pfpUrl: 'https://i.imgur.com/gBEyS2b.jpg', // A reliable, generic fallback PFP
    streak: 0,
    totalClaimed: '0',
    weeklyPoints: '0',
    weeklyRank: 0,
  };

  if (!fid) return fallbackUser;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/user/profile?fid=${fid}`, { cache: revalidate ? 'no-cache' : 'default' });
    if (!response.ok) {
        console.error(`API call for FID ${fid} failed with status ${response.status}`);
        return fallbackUser;
    }
    const user = await response.json();
    console.log('Fetched user from API:', user);

    return {
      username: user.username || fallbackUser.username,
      pfpUrl: user.pfpUrl || fallbackUser.pfpUrl,
      streak: user.streak ?? fallbackUser.streak,
      totalClaimed: user.totalClaimed || fallbackUser.totalClaimed,
      weeklyPoints: user.weeklyPoints || fallbackUser.weeklyPoints,
      weeklyRank: user.weeklyRank ?? fallbackUser.weeklyRank,
    };
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return fallbackUser;
  }
}

async function getTopUsers(revalidate = false): Promise<LeaderboardUser[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/leaderboard`, { cache: revalidate ? 'no-cache' : 'default' });
    if (!response.ok) return [];
    const data = await response.json();
    return data.topUsers || [];
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
}

// --- UI COMPONENTS ---
// Updated StatItem component: Text-only labels and verified number formatting.
const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '15px 10px',
    backgroundColor: 'rgba(240, 240, 255, 0.6)',
    borderRadius: '15px',
    flex: 1, // Ensures each item takes equal space
    textAlign: 'center',
  }}>
    <span style={{ fontSize: 24, color: 'rgb(100, 80, 120)', fontWeight: 'bold' }}>
      {label}
    </span>
    <span style={{ fontSize: 40, fontWeight: 'bold', color: 'rgb(55, 35, 73)' }}>
      {value}
    </span>
  </div>
);

export async function GET(request: NextRequest) {
  try {
    const spaceMonoRegularFont = await spaceMonoRegularFontPromise;

    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid') || '';
    const revalidate = searchParams.get('revalidate') === 'true';

    // --- PARALLEL DATA FETCHING ---
    const [fetchedUserProfile, topUsersData] = await Promise.all([
      getUserProfile(fid, revalidate),
      getTopUsers(revalidate)
    ]);

    // Extract all potential parameters from the URL
    const urlUsername = searchParams.get('username');
    const urlPfpUrl = searchParams.get('pfpUrl');
    const urlStreak = searchParams.get('streak');
    const urlClaimed = searchParams.get('claimed');
    const urlWeeklyPoints = searchParams.get('weeklyPoints');
    const urlRank = searchParams.get('rank');

    // Construct the user profile for display, prioritizing URL parameters
    const displayUserProfile: UserProfile = {
      username: urlUsername || fetchedUserProfile.username,
      pfpUrl: urlPfpUrl || fetchedUserProfile.pfpUrl,
      streak: urlStreak ? parseInt(urlStreak) : fetchedUserProfile.streak,
      totalClaimed: urlClaimed || fetchedUserProfile.totalClaimed,
      weeklyPoints: urlWeeklyPoints || fetchedUserProfile.weeklyPoints,
      weeklyRank: urlRank ? parseInt(urlRank) : fetchedUserProfile.weeklyRank,
    };

    const topUsers = topUsersData.slice(0, 5).map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            //backgroundColor: 'rgba(75, 153, 129, 1)',
            backgroundColor: 'rgb(255, 240, 230)',
            color: 'rgb(55, 35, 73)',
            fontFamily: '"Space Mono"',
          }}
        >
          {/* --- MAIN CONTENT AREA --- */}
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', padding: '40px 60px' }}>

            {/* --- LEFT SIDE: User's Stats Card --- */}
            <div style={{ width: '39%', display: 'flex', marginLeft:'50px'}}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '25px',
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '25px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                width: '100%',
              }}>
                <img src={displayUserProfile.pfpUrl} width={120} height={120} style={{ borderRadius: '50%', border: '4px solid rgb(116, 51, 235)' }} />
                <span style={{ fontSize: 42, fontWeight: 'bold' }}>
                  @{displayUserProfile.username}
                </span>
                {/* Updated stats row with text-only labels */}
                <div style={{ display: 'flex', width: '100%', gap: '15px' }}>
                  <StatItem label="Points" value={formatPoints(parseFloat(displayUserProfile.weeklyPoints))} />
                  <StatItem
                    label={`Streak${displayUserProfile.streak <= 1 ? '' : 's'}`}
                    value={String(displayUserProfile.streak)}
                  />
                  <StatItem label="Claimed" value={formatPoints(parseFloat(displayUserProfile.totalClaimed))} />
                </div>
              </div>
            </div>

            {/* --- RIGHT SIDE: Game Info and Leaderboard --- */}
            <div style={{ width: '55%', display: 'flex', flexDirection: 'column', paddingLeft: '50px', justifyContent: 'center' }}>
              <h1 style={{ fontSize: 72, margin: '0 0 20px 0' }}>ENB BLAST</h1>
              <div style={{ display: 'flex', alignItems: 'center', border: '3px solid rgb(116, 51, 235)', padding: '15px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <img src={displayUserProfile.pfpUrl} width={70} height={70} style={{ borderRadius: '50%' }} />
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '15px' }}>
                  <span style={{ fontSize: 32, fontWeight: 'bold' }}>@{displayUserProfile.username}</span>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <span style={{ fontSize: 22, backgroundColor: '#e0e7ff', padding: '5px 10px', borderRadius: '99px' }}>🏆 Rank: {displayUserProfile.weeklyRank}</span>
                    <span style={{ fontSize: 22, backgroundColor: '#fef3c7', padding: '5px 10px', borderRadius: '99px' }}>🔥 {displayUserProfile.streak}</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 28, margin: '40px 0 15px 0', fontWeight: 'bold' }}>Leaderboard</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topUsers.map((user) => (
                  <div key={user.fid} style={{ display: 'flex', alignItems: 'center', width: '100%', backgroundColor: 'rgba(255,255,255,0.5)', padding: '5px 10px', borderRadius: '10px' }}>
                    <span style={{ fontSize: 24, width: '40px' }}>#{user.rank}</span>
                    <img src={user.pfpUrl} width={45} height={45} style={{ borderRadius: '50%', margin: '0 10px' }} />
                    <span style={{ fontSize: 24, fontWeight: 'bold' }}>{user.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- FOOTER --- */}
          <div style={{ width: '100%', backgroundColor: 'rgb(55, 35, 73)', color: 'white', fontSize: '36px', padding: '20px 0', textAlign: 'center', fontWeight: 'bold' }}>
            Play Now & Beat My Score!
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: 'Space Mono', data: spaceMonoRegularFont, style: 'normal' }],
      },
    );
  } catch (e: any) {
    console.error(`Failed to generate combined image: ${e.message}`);
    return new Response(`Failed to generate the image`, { status: 500 });
  }
}
