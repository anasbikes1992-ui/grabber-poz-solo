import { NextResponse } from 'next/server';
import { defaultJarvisToolRegistry } from '@/lib/ai/jarvis-tools';
import { JarvisUserContext } from '@/lib/ai/jarvis-types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { toolName, args, confirmationToken } = body;

    const defaultContext: JarvisUserContext = {
      userId: 'user_owner_01',
      userName: 'Business Owner',
      role: 'OWNER',
      assignedBranchIds: ['br_colombo_main'],
      assignedWarehouseIds: ['wh_central_colombo'],
    };

    if (confirmationToken) {
      const result = await defaultJarvisToolRegistry.confirmToolExecution(confirmationToken);
      return NextResponse.json(result);
    }

    if (!toolName) {
      return NextResponse.json({
        message: 'Jarvis grounded copilot ready. Pass toolName to execute a validated action.',
      });
    }

    const result = await defaultJarvisToolRegistry.invokeTool(toolName, args || {}, defaultContext);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
