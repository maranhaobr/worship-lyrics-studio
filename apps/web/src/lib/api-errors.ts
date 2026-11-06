import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function apiResponse(action: () => Promise<Response>): Promise<Response> {
  try { return await action(); }
  catch (error) {
    if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError) return NextResponse.json({ error: 'Dados inválidos', details: error.flatten() }, { status: 422 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    console.error('Visual editor request failed', error);
    return NextResponse.json({ error: 'Não foi possível concluir a operação' }, { status: 500 });
  }
}
