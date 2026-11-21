import 'server-only';
import { ApiError } from '../api-errors';
import { requireSandbox } from './asaas-config';

/** Fixed Sandbox destination; never follow redirects with a credential. */
export async function asaas(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: object): Promise<unknown> {
  const { key } = requireSandbox();
  if (!/^\/[a-zA-Z0-9_/?=&%-]+$/.test(path)) throw new ApiError(500, 'Recurso de cobrança inválido');
  try {
    const response = await fetch(`https://api-sandbox.asaas.com/v3${path}`, {
      method, headers: { access_token: key, 'Content-Type': 'application/json', 'User-Agent': 'WorshipLyricsStudio/1.0' },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ApiError(502, 'O Asaas não concluiu a solicitação. Confira a configuração e os dados de cobrança.');
    }
    return await response.json() as unknown;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Never log upstream bodies, customer data, headers or fetch exceptions.
    throw new ApiError(502, 'Sem confirmação do Asaas. Não repita a contratação; use Atualizar situação para conciliar.');
  }
}
