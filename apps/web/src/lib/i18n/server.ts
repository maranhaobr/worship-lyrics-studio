import 'server-only';
import { cookies } from 'next/headers';
import { parseLocale, translator } from './index';
export async function getTranslator() { return translator(parseLocale((await cookies()).get('wls_locale')?.value)); }
