import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '@/lib/api-errors';
import { saveVisualTemplate } from '@/lib/visual-template-data';
export const runtime = 'nodejs';
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiResponse(async () => NextResponse.json(await saveVisualTemplate(await req.json(), (await params).id)));
}
