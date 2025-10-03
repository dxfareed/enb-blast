
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
