import 'server-only';
import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { workspaceRoot } from '../server-paths';
import { ApiError } from '../api-errors';
import { digest } from './crypto';

export type AccountMail = { to: string; kind: 'VERIFY_EMAIL' | 'RESET_PASSWORD'; link: string };
export function mailConfig() {
  const production = process.env.NODE_ENV === 'production';
  const origin = new URL(process.env.APP_ORIGIN ?? (production ? 'about:blank' : 'http://localhost:3000'));
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || (production && origin.protocol !== 'https:')) throw new ApiError(503, 'Configure APP_ORIGIN com a origem pública da aplicação.');
  const mode = process.env.MAIL_TRANSPORT ?? (production ? 'smtp' : 'file');
  if (!['smtp', 'file'].includes(mode) || (production && mode !== 'smtp')) throw new ApiError(503, 'Configure o envio SMTP de e-mails.');
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (mode === 'smtp' && (!process.env.SMTP_HOST || !process.env.MAIL_FROM || !Number.isInteger(port) || port < 1 || port > 65535 || Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD))) throw new ApiError(503, 'Configure o envio SMTP de e-mails.');
  return { origin: origin.origin, mode, port, production };
}
export async function sendAccountMail(message: AccountMail) {
  const config = mailConfig();
  const verify = message.kind === 'VERIFY_EMAIL';
  const subject = verify ? 'Confirme seu e-mail — Worship Lyrics Studio' : 'Redefina sua senha — Worship Lyrics Studio';
  const text = `${verify ? 'Confirme seu endereço de e-mail' : 'Crie uma nova senha'} no Worship Lyrics Studio:\n\n${message.link}\n\nEste link pode ser usado uma vez e expira em ${verify ? '24 horas' : '30 minutos'}. Se você não solicitou esta ação, ignore esta mensagem.`;
  if (config.mode === 'file') {
    const directory = resolve(workspaceRoot(), '.data/mail');
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, `${digest(`${message.to}:${message.kind}`)}.json`), JSON.stringify({ ...message, subject, text }), { mode: 0o600 });
    return;
  }
  const secure = process.env.SMTP_SECURE === 'true' || config.port === 465;
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: config.port, secure, requireTLS: config.production || process.env.SMTP_REQUIRE_TLS !== 'false', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000, disableFileAccess: true, disableUrlAccess: true });
  try { await transport.sendMail({ from: process.env.MAIL_FROM, to: message.to, subject, text }); }
  finally { transport.close(); }
}
