import { prisma } from '@wls/database';
import { randomBytes, createHash } from 'node:crypto';
async function main() {
  const email = process.argv[2]?.trim().toLowerCase(), churchId = process.argv[3] ?? 'legacy-church';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Uso: npm run accounts:invite-owner -- email-do-responsavel [id-da-igreja]');
  const raw = randomBytes(32).toString('base64url');
  await prisma.$transaction(async tx => {
    const church = await tx.church.findUnique({ where: { id: churchId } }); if (!church) throw new Error('Igreja não encontrada');
    await tx.$queryRaw`SELECT id FROM "Church" WHERE id=${churchId} FOR UPDATE`;
    if (await tx.membership.count({ where: { churchId } })) throw new Error('A igreja já possui membros. Use a gestão da equipe para alterar responsáveis.');
    await tx.invitation.deleteMany({ where: { churchId, role: 'OWNER' } });
    await tx.invitation.create({ data: { churchId, email, role: 'OWNER', tokenHash: createHash('sha256').update(raw).digest('hex'), expiresAt: new Date(Date.now() + 7 * 86400000) } });
  });
  console.log(`${process.env.APP_ORIGIN ?? 'http://localhost:3000'}/register?invitation=${raw}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
