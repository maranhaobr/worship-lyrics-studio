# Editor Visual 2.0

## Executar

```sh
npm install
npm run db:generate
npm exec -w @wls/database -- prisma migrate deploy
npm run dev
```

O Next.js carrega o `.env` da raiz do repositório pela configuração do app. Não é necessário duplicar `DATABASE_URL` em `apps/web`; variáveis já definidas no ambiente têm prioridade.

Se o Windows bloquear a DLL do Prisma, encerre o servidor de desenvolvimento antes de executar `db:generate` e reinicie-o depois.

Na biblioteca, abra uma música salva e clique em **Criar projeto visual**. Os projetos também ficam disponíveis em `/visual-projects`.

## Fluxo de edição

- Cada projeto copia a letra salva e recebe IDs próprios; alterações/exclusão da música não apagam seus projetos.
- Reimportar a letra substitui os blocos e tempos pela versão da música carregada na página. Pode ser desfeito.
- Cada linha vira um bloco de quatro segundos quando não há tempos cadastrados. Tempos sobrepostos da origem são normalizados.
- Templates copiam fundo, texto e animação, sem substituir letra ou sincronização. Templates existentes não mudam quando o visual do projeto muda.
- A timeline permite mover e redimensionar blocos sem sobreposição. Os campos do bloco permitem ajuste preciso em segundos.
- Tempos por palavra são relativos ao bloco. Redimensionar escala esses tempos; alterar a letra redistribui as palavras.
- Salve explicitamente. Revisões impedem sobrescrever alterações de outra aba; desfazer/refazer mantém até 50 alterações.
- O preview é silencioso e usa a mesma composição da exportação. Fundos em vídeo repetem até o fim do projeto.

Formato inicial: 1920×1080, 30 fps, até uma hora, uma faixa de letras. Não inclui sincronização automática com áudio.

## Mídia

PNG, JPEG, WebP, MP4 e WebM, até 50 MB por arquivo. O navegador precisa conseguir abrir o vídeo para obter sua duração. Essa duração é informada pelo cliente; um pipeline de produção deve validar/transcodificar o conteúdo no servidor.

O adaptador local grava em `.data/media` quando o servidor é iniciado pelo workspace web. Configure `MEDIA_STORAGE_DIR` com caminho absoluto para armazenamento fora desse fluxo. Faça backup tanto do PostgreSQL quanto desse diretório. Em deploy com várias instâncias, substitua o adaptador por armazenamento de objetos compartilhado.

O endpoint de conteúdo suporta HTTP Range. O MVP ainda não tem autenticação ou isolamento por organização: não publique uploads/projetos abertos na internet.

## MP4 local sem áudio

No editor, clique em **Baixar projeto de renderização** e execute, na raiz:

```sh
npm run render:video -- caminho/projeto.json out/video.mp4
```

Mantenha o servidor acessível durante a renderização de fundos em imagem/vídeo: o arquivo JSON referencia URLs absolutas de mídia. Para renderizar em outra máquina, essas URLs devem ser acessíveis por ela. O Remotion pode baixar o Chrome Headless Shell na primeira execução.

O comando usa H.264/yuv420p e `muted: true`, não sobrescreve arquivos existentes e não adiciona trilha de áudio. Não existe endpoint público de renderização nem fila/worker nesta etapa. Antes da oferta comercial, verifique os termos de licença do Remotion para sua organização.

## Arquitetura e verificações

- `packages/shared/src/visual`: schemas Zod, tipos, presets e operações temporais.
- `packages/video`: composição determinística por frame, compartilhada pelo Player e renderer.
- `apps/web/src/components/visual-editor`: controles do editor e timeline.
- `apps/web/src/lib`: persistência, revisão otimista e armazenamento local.
- `VisualProject.document` e `VisualTemplate.style`: JSONB validado; `schemaVersion` permite migrações futuras de documentos.
- Relação com a música usa `SET NULL`, preservando projetos independentes.

```sh
npm run typecheck
npm test
npm run build
```

Com o servidor local disponível, execute `npm run test:integration` para verificar o CRUD, snapshots, conflitos, templates e upload/HTTP Range. O teste cria e remove somente seus próprios dados. `TEST_BASE_URL` permite apontar para outra porta local.

`npm run test:browser` verifica hidratação do editor, blocos, desfazer/refazer, salvamento e largura em dispositivo móvel usando o Chrome Headless do Remotion. Salva uma captura em `out/editor-smoke.png` e remove seus dados temporários.

`npm run test:render` renderiza gradiente, imagem e vídeo em loop (incluindo uma origem com áudio) e usa FFprobe para confirmar resolução e ausência de faixa de áudio. Requer o servidor disponível e pode baixar o navegador na primeira execução. Os resultados ficam em `out/`.

O cliente Prisma é gerado em `packages/database/generated/client`. `NEXT_DIST_DIR` permite usar um diretório de build separado do servidor de desenvolvimento, por exemplo `.next-build`.

As dependências Remotion estão fixadas na mesma versão. A auditoria de dependências também aponta problemas herdados na stack Next 15/Prisma 6/Zod 3. A atualização dessas versões principais deve ser tratada separadamente, com testes de migração.
