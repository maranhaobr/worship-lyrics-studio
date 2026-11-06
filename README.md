# Worship Lyrics Studio — Editor Visual 2.0

O cadastro de músicas continua disponível. A Fase 2 adiciona projetos visuais independentes, templates reutilizáveis, fundos em gradiente/imagem/vídeo, quatro animações, timeline e preview Remotion.

Veja [o guia do editor visual](docs/visual-editor.md) para migração, mídia, sincronização e renderização local de MP4 sem áudio.

Aplicação web para cadastro, organização e prévia de letras de louvor.

## Pré-requisitos
- Node.js 20.9+ (recomendado 22)
- npm 10+
- Docker Desktop ou PostgreSQL 16

## Executar localmente

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm exec -w @wls/database -- prisma migrate deploy
npm run dev
```

Abra http://localhost:3000. No Windows PowerShell, use `Copy-Item .env.example .env` em vez de `cp`.

## API
- `GET /api/songs?q=termo` — pesquisa músicas
- `POST /api/songs` — cadastra música com seções e linhas
- `GET /api/songs/:id` — detalhes
- `PUT /api/songs/:id` — substitui dados e seções em transação
- `DELETE /api/songs/:id` — exclui música e seus dados relacionados

Exemplo de payload:
```json
{
  "title":"Música de exemplo",
  "artist":"Ministério",
  "key":"G",
  "bpm":72,
  "sections":[{
    "type":"VERSE",
    "label":"Verso 1",
    "lines":[{"text":"Primeira linha"},{"text":"Segunda linha"}]
  }]
}
```

## Deploy online
Hospede o app Next.js em um serviço que suporte Node.js e conecte a um PostgreSQL gerenciado via `DATABASE_URL`. Execute `npm run db:generate` e `npx prisma migrate deploy --schema packages/database/prisma/schema.prisma` no processo de deploy. O banco do Docker é apenas para desenvolvimento.

**Importante:** este MVP não tem autenticação nem autorização e não deve ser exposto publicamente antes da implementação dessas camadas. Não há upload de áudio, sincronização automática ou modo ao vivo. A exportação MP4 está disponível por comando local, conforme o guia do editor.

## Próximas evoluções
- Autenticação, organizações, papéis e isolamento por tenant
- Upload de áudio para armazenamento S3
- Timeline de alinhamento letra/áudio
- Render worker Remotion/FFmpeg
- Player ao vivo e apresentação em tela separada
- Histórico persistente de versões e renderização hospedada
