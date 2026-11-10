import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, ApiError } from '@/lib/api-errors';
import { importProPresenter, MAX_PRO_SIZE } from '@/lib/propresenter';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  return apiResponse(async () => {
    if (Number(request.headers.get('content-length')) > MAX_PRO_SIZE + 65536) throw new ApiError(413, 'Envie um arquivo .pro de até 5 MB.');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !/\.pro$/iu.test(file.name) || !file.size || file.size > MAX_PRO_SIZE) throw new ApiError(422, 'Envie uma apresentação .pro de até 5 MB.');
    try { return NextResponse.json(importProPresenter(new Uint8Array(await file.arrayBuffer()), file.name)); }
    catch (error) { throw new ApiError(422, error instanceof Error ? error.message : 'Não foi possível ler a apresentação.'); }
  });
}
