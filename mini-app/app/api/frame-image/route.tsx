import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    // Fetch font data
    const fontUrl = `${process.env.NEXT_PUBLIC_URL}/SpaceMono-Regular.ttf`;
    const fontResponse = await fetch(fontUrl);
    const spaceMonoRegularFont = await fontResponse.arrayBuffer();

    const { searchParams } = new URL(request.url);
    const score = searchParams.get('score') || '0';
    const username = searchParams.get('username') || '@johndoe';
    const pfpUrl = searchParams.get('pfpUrl') || 'https://pbs.twimg.com/profile_images/1734354549496836096/-laoU9C9_400x400.jpg'; // Default PFP
    const streak = searchParams.get('streak') || '0';
    const claimed = searchParams.get('claimed') || '0';
    const weeklyPoints = searchParams.get('weeklyPoints') || '0';
    const rank = searchParams.get('rank') || 'N/A';

    console.log("frame-image API: Points value before ImageResponse:", weeklyPoints); // Debug points
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgb(116, 51, 235)', // Background color from user
            padding: '50px 80px', // Increased horizontal padding
            color: 'white',
            fontFamily: 'Space Mono', // Use the loaded font
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 style={{ fontSize: '48px', margin: '0', paddingLeft:'20px' }}>ENB BLAST STATS</h1>
              <img
                src={pfpUrl}
                width={200}
                height={200}
                style={{ borderRadius: '100px', marginTop: '20px' }}
              />
              <p style={{ fontSize: '36px', margin: '10px 0 0 0' }}>{username}</p>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '300px',
                height: '200px',
                borderRadius: '20px',
                border: '2px solid white',
                marginTop: '20px',
                marginLeft: '35px',
              }}
            >
              <p style={{ fontSize: '36px', margin: '0' }}>Current Rank</p>
              <p style={{ fontSize: '48px', margin: '0' }}>{rank}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: '50px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0' }}>STREAK</p>
              <p style={{ fontSize: '48px', margin: '0' }}>{streak}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0' }}>CLAIMED</p>
              <p style={{ fontSize: '48px', margin: '0' }}>{claimed}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontSize: '48px', margin: '0' }}>WEEKLY POINTS</p>
              <p style={{ fontSize: '48px', margin: '0' }}>{weeklyPoints}</p>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Space Mono',
            data: spaceMonoRegularFont,
            style: 'normal',
          },
        ],
      },
    );
  } catch (e: any) {
    console.error(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}