import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '@/lib/api-errors';
import { listVisualTemplates, saveVisualTemplate } from '@/lib/visual-template-data';
export const runtime = 'nodejs';
export async function GET() { return apiResponse(async () => NextResponse.json(await listVisualTemplates())); }
export async function POST(req: NextRequest) { return apiResponse(async () => NextResponse.json(await saveVisualTemplate(await req.json()), { status: 201 })); }
