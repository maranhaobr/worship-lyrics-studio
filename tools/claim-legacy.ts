import { prisma } from '@wls/database';
async function main() {
  const email = process.argv[2]?.trim().toLowerCase(), selected = process.argv[3];
  if (!email) throw new Error('Uso: npm run accounts:claim-legacy -- email-do-responsavel [id-da-igreja]');
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { where: { role: 'OWNER', ...(selected ? { churchId: selected } : {}) } } } });
  if (!user || user.memberships.length !== 1) throw new Error('Cadastre a conta primeiro. Informe a igreja explicitamente se houver mais de uma sob sua responsabilidade.');
  const churchId = user.memberships[0].churchId;
  const counts = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Church" WHERE id='legacy-church' FOR UPDATE`;
    const songs = await tx.song.updateMany({ where: { churchId: 'legacy-church' }, data: { churchId } });
    const projects = await tx.visualProject.updateMany({ where: { churchId: 'legacy-church' }, data: { churchId } });
    const templates = await tx.visualTemplate.updateMany({ where: { churchId: 'legacy-church' }, data: { churchId } });
    const media = await tx.mediaAsset.updateMany({ where: { churchId: 'legacy-church' }, data: { churchId } });
    return { songs: songs.count, projects: projects.count, templates: templates.count, media: media.count };
  });
  console.log('Acervo vinculado à igreja selecionada:', counts);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
