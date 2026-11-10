# Worship Lyrics Studio — Editor Visual 2.0

O cadastro de músicas continua disponível. A Fase 2 adiciona projetos visuais independentes, templates reutilizáveis, fundos em gradiente/imagem/vídeo, quatro animações, timeline e preview Remotion.

Em `/visual-projects/new`, cole ou envie a letra completa em `.txt` para gerar um MP4 com slides e tempos estimados. Cada frase pode ter texto, fundo e efeito próprios, com download do vídeo pela interface.

Veja [o guia do editor visual](docs/visual-editor.md) para migração, mídia, sincronização e renderização local de MP4 sem áudio.

O [serviço separado de alinhamento](docs/audio-alignment.md) aceita áudio de referência e sincroniza frases/palavras por uma fila PostgreSQL e worker Python/WhisperX, preservando a edição visual.

Aplicação web para cadastro, organização e prévia de letras de louvor.

Contas por igreja, convites e quatro perfis de acesso estão descritos no [guia de contas e permissões](docs/accounts.md). O primeiro responsável pelo acervo anterior é convidado pelo operador; novos cadastros criam igrejas independentes.

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

**Contas e acesso:** a aplicação exige login e isola o conteúdo por igreja. Para produção, configure `APP_ORIGIN` com a origem HTTPS exata; veja as etapas ainda pendentes no guia de contas. O alinhamento automático requer o worker Python opcional; a qualidade precisa ser avaliada com gravações cantadas. Não há modo ao vivo. A exportação MP4 está disponível pela interface no servidor Node local ou por comando, conforme o guia do editor. Para produção, a renderização precisa de fila e workers dedicados.

## Próximas evoluções
- Verificação de e-mail, recuperação de senha por e-mail e MFA
- Upload de áudio para armazenamento S3
- Timeline de alinhamento letra/áudio
- Render worker Remotion/FFmpeg
- Player ao vivo e apresentação em tela separada
- Histórico persistente de versões e renderização hospedada
