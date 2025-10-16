import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const StatItem = ({ label, value }: { label: string; value: string }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '10px',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      flex: 1,
      textAlign: 'center',
    }}>
      <span style={{ fontSize: 16, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: '800', color: '#1f2937' }}>
        {value}
      </span>
    </div>
  );

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const username = searchParams.get('username') || 'Anonymous';
  const pfpUrl = searchParams.get('pfpUrl') || '';
  const rank = searchParams.get('rank') || 'N/A';
  const weeklyPoints = parseInt(searchParams.get('weeklyPoints') || '0').toLocaleString();
  const totalClaimed = parseFloat(searchParams.get('totalClaimed') || '0').toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const spaceMonoBold = fetch(
    new URL('/SpaceMono-Bold.ttf', process.env.NEXT_PUBLIC_URL as string)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#f0f2f5',
          fontFamily: '"Space Mono"',
          color: '#1f2937',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flexGrow: 1,
          padding: '30px',
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '25px',
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '2px solid #e5e7eb',
                boxShadow: '0 6px 15px rgba(0, 0, 0, 0.08)',
                width: '100%',
            }}>
                <img
                    src={pfpUrl || `${process.env.NEXT_PUBLIC_URL}/icon.png`}
                    alt="PFP"
                    width="90"
                    height="90"
                    style={{
                    borderRadius: '50%',
                    border: '4px solid #3b82f6',
                    marginBottom: '15px',
                    }}
                />
                <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 20px 0' }}>
                    {username}
                </h1>
                <div style={{ display: 'flex', width: '100%', gap: '15px' }}>
                    <StatItem label="Rank" value={`#${rank}`} />
                    <StatItem label="Points" value={weeklyPoints} />
                    <StatItem label="Earned" value={`${totalClaimed} $ENB`} />
                </div>
            </div>
        </div>
        <div style={{
          width: '100%',
          backgroundColor: 'rgb(55, 35, 73)',
          color: 'white',
          fontSize: '24px',
          padding: '15px 0',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          Let's gooo, blast some ENBs!
        </div>
      </div>
    ),
    {
      width: 600,
      height: 400,
      fonts: [
        {
          name: 'Space Mono',
          data: await spaceMonoBold,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  );
}
