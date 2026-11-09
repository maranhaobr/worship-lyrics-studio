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

## Letra inteira → vídeo pronto

Em **Projetos visuais → Criar vídeo com letra** (`/visual-projects/new`), cole a letra ou envie um `.txt` UTF-8 de até 400 KB/100 mil caracteres. Escolha o template e o ritmo. Cada linha vira um slide; frases longas são divididas sem descartar palavras. Títulos `[Verso]` e `[Refrão]` organizam as partes. Repetições escritas na letra são mantidas.

**Gerar vídeo completo** cria o projeto e inicia o MP4 automaticamente. **Revisar slides antes de gerar** abre o editor sem renderizar. A duração é estimada pelo tamanho das frases: não há alinhamento com uma gravação de áudio.

Linhas como `Verso 1`, `Verso 2`, `Pré-refrão`, `Refrão`, `Tag`, `Instrumental`, `Prelúdio` e `Ponte` são marcadores de seção, com ou sem colchetes, e não viram letras. A detecção considera a linha inteira: frases como “Uma ponte sobre as águas” são preservadas. Em projetos antigos que já contenham esses marcadores como blocos, o texto fica oculto no preview e no MP4, preservando os tempos e fundos existentes. Esses blocos podem ser removidos manualmente da timeline.

No editor, selecione o slide nas miniaturas e escolha **Aplicar alterações a → Slide selecionado**. Fundo, texto e efeito podem variar por frase. **Visual padrão do vídeo** altera o estilo herdado; **Usar visual padrão neste slide** remove suas personalizações. Templates também podem ser aplicados individualmente. Projetos anteriores continuam compatíveis e não exigem migração do banco.

### Temas e tipografia

A galeria inclui **Natal · Noite de luz**, **Páscoa · Amanhecer**, **Papel · Adoração acústica**, **Cinemático · Luz e presença**, **Impacto · Fé em destaque** e **Tipografia · Worship moderno**. São cenários vetoriais originais, com cores, tipografia e decoração coordenadas. Não reproduzem as imagens de referência. O painel **Cenário e atmosfera** permite combinar a decoração com uma imagem ou vídeo enviado, alterar a cor e intensidade e desligar o movimento ambiente. Para cenários fotográficos, use o upload de fundo.

Em **Texto**, ajuste fonte, peso, itálico, caixa alta, tamanho até 240 px, espaçamento, altura de linha, largura, alinhamento, posição e deslocamentos horizontal/vertical. Contorno, sombra/brilho e faixa de contraste ajudam a leitura. Deslocamentos grandes e frases longas devem ser conferidos no preview para evitar cortes. Oswald, Montserrat, Playfair Display e Dancing Script são empacotadas localmente com Fontsource; a renderização aguarda seu carregamento. Arial, Georgia e Verdana continuam disponíveis como fontes do sistema. Salve combinações como templates reutilizáveis.

As decorações e os movimentos são calculados por frame, compartilhados entre preview e MP4. Essas alterações visuais preservam os tempos do alinhamento com áudio. Para gerar prévias PNG dos novos temas, execute `npx tsx tools/preview-themes.ts`; elas ficam em `out/themes`.

**Gerar MP4 completo** renderiza a versão atual, inclusive alterações ainda não salvas. O botão **Baixar vídeo pronto** aparece ao concluir. Se você editar durante a renderização, a interface indica que deve gerar uma nova versão. Salve o projeto para preservar as edições após fechar a página.

## Fluxo de edição

- Cada projeto copia a letra salva e recebe IDs próprios; alterações/exclusão da música não apagam seus projetos.
- Reimportar a letra substitui os blocos e tempos pela versão da música carregada na página. Pode ser desfeito.
- Cada linha vira um bloco de quatro segundos quando não há tempos cadastrados. Tempos sobrepostos da origem são normalizados.
- Templates copiam fundo, texto e animação, sem substituir letra ou sincronização. Templates existentes não mudam quando o visual do projeto muda.
- A timeline permite mover e redimensionar blocos sem sobreposição. Os campos do bloco permitem ajuste preciso em segundos.
- Tempos por palavra são relativos ao bloco. Redimensionar escala esses tempos; alterar a letra redistribui as palavras.
- Salve explicitamente. Revisões impedem sobrescrever alterações de outra aba; desfazer/refazer mantém até 50 alterações.
- O preview usa a mesma composição visual da exportação. Ao selecionar um áudio de referência, ele é reproduzido apenas no preview. Fundos em vídeo repetem até o fim do projeto.
- Em **Animação**, ajuste a permanência após a frase (padrão: 400 ms), o efeito de saída (Fade, Slide, Zoom ou sem efeito) e sua duração (padrão: 300 ms). A exibição é prolongada sem alterar os tempos do canto e termina antes da próxima frase ou do fim do vídeo. Sem intervalo disponível, a saída é encurtada. O fundo personalizado acompanha a permanência do slide. Projetos existentes recebem esses padrões de exibição sem migração.

Formato inicial: 1920×1080, 30 fps, até uma hora, uma faixa de letras. O [alinhamento com áudio](audio-alignment.md) requer o worker Python opcional; sem ele, os tempos iniciais continuam estimados.

## Mídia

PNG, JPEG, WebP, MP4 e WebM, até 50 MB por arquivo. O navegador precisa conseguir abrir o vídeo para obter sua duração. Essa duração é informada pelo cliente; um pipeline de produção deve validar/transcodificar o conteúdo no servidor.

O adaptador local grava em `.data/media` na raiz, iniciando o servidor pela raiz ou pelo workspace web. Configure `MEDIA_STORAGE_DIR` com caminho absoluto para outro diretório. Faça backup tanto do PostgreSQL quanto desse diretório. Em deploy com várias instâncias, substitua o adaptador por armazenamento de objetos compartilhado.

O endpoint de conteúdo suporta HTTP Range. O MVP ainda não tem autenticação ou isolamento por organização: não publique uploads/projetos abertos na internet.

## MP4 local sem áudio

A interface já gera MP4 pelo servidor Node local. Alternativamente, em **Arquivo do projeto**, clique em **Baixar projeto editável (JSON)** e execute, na raiz:

```sh
npm run render:video -- caminho/projeto.json out/video.mp4
```

Mantenha o servidor acessível durante a renderização de fundos em imagem/vídeo: o arquivo JSON referencia URLs absolutas de mídia. Para renderizar em outra máquina, essas URLs devem ser acessíveis por ela. O Remotion pode baixar o Chrome Headless Shell na primeira execução.

O comando usa H.264/yuv420p e `muted: true`, não sobrescreve arquivos existentes e não adiciona trilha de áudio. A interface usa `POST /api/visual-projects/:id/export`, copia as mídias referenciadas para um diretório temporário privado e remove os arquivos ao concluir o download. Aceita uma renderização por processo; requisições simultâneas recebem 429. Mantenha a página aberta durante a geração. Pode baixar o Chrome Headless na primeira execução.

Esse fluxo requer Node, Chrome/FFmpeg e o repositório completo no servidor. Para SaaS público, é necessário autenticar/proteger a API e mover a renderização para uma fila durável com workers e armazenamento compartilhado. Limites de tempo de plataformas serverless podem interromper vídeos longos. Antes da oferta comercial, verifique os termos de licença do Remotion para sua organização.

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

`npm run test:lyrics-browser` percorre o formulário de letra inteira, a geração automática do MP4 e a personalização de um slide, verificando que o efeito dos outros slides é preservado.

`npm run test:render` renderiza gradiente, imagem e vídeo em loop (incluindo uma origem com áudio) e usa FFprobe para confirmar resolução e ausência de faixa de áudio. Requer o servidor disponível e pode baixar o navegador na primeira execução. Os resultados ficam em `out/`.

O cliente Prisma é gerado em `packages/database/generated/client`. `NEXT_DIST_DIR` permite usar um diretório de build separado do servidor de desenvolvimento, por exemplo `.next-build`.

As dependências Remotion estão fixadas na mesma versão. A auditoria de dependências também aponta problemas herdados na stack Next 15/Prisma 6/Zod 3. A atualização dessas versões principais deve ser tratada separadamente, com testes de migração.
