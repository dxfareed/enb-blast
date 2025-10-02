
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { stdout, stderr } = await execPromise('node scripts/reset-daily-tasks.mjs');
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    return NextResponse.json({ success: true, stdout, stderr });
  } catch (error) {
    console.error('Error executing script:', error);
    //@ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
