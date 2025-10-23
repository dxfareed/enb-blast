import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getWeekIdentifier } from '@/app/utils/time';

export async function POST(request: Request) {
  try {
    const { imageData, stats } = await request.json();

    if (!imageData || !stats) {
      return NextResponse.json({ error: 'Missing image data or stats' }, { status: 400 });
    }

    // 1. Upload Image to Vercel Blob
    const imageBlob = await put(`recap-${stats.fid}-${getWeekIdentifier()}.png`, Buffer.from(imageData.split(',')[1], 'base64'), {
      access: 'public',
      contentType: 'image/png',
    });

    // 2. Create Metadata
    const metadata = {
      name: `Weekly Recap for ${stats.username}`,
      description: `A snapshot of ${stats.username}'s performance for the week.`,
      image: imageBlob.url,
      attributes: [
        { trait_type: 'Rank', value: stats.rank },
        { trait_type: 'Weekly Points', value: stats.weeklyPoints },
        { trait_type: 'Reward Earned', value: `${stats.rewardEarned} ${stats.rewardToken}` },
      ],
    };

    // 3. Upload Metadata to Vercel Blob
    const metadataBlob = await put(`recap-metadata-${stats.fid}-${getWeekIdentifier()}.json`, JSON.stringify(metadata), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({ metadataUrl: metadataBlob.url });
  } catch (error) {
    console.error('Error in mint-recap API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
