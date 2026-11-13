# Editor Visual 2.0

## Tema e idioma da interface

Os seletores de tema claro/escuro e Português/English/Español ficam no cabeçalho da landing e no menu lateral do Studio. No celular, ficam no cabeçalho da área interna. As escolhas são compartilhadas entre as áreas e salvas em cookies de preferência por um ano neste navegador. O servidor aplica as preferências já na resposta inicial, evitando a troca de tema após carregar a página.

A linguagem da interface não traduz nem modifica letras, nomes de projetos, músicas ou templates criados pelo usuário. No editor, a troca acontece sem recarregar os componentes de edição e preserva alterações ainda não salvas. As listas renderizadas no servidor são atualizadas ao selecionar outro idioma. O atributo `lang` do documento acompanha a escolha.

O catálogo de interface fica em `apps/web/src/lib/i18n/messages.json`, com traduções explícitas para inglês e espanhol; português é a origem. Dados desconhecidos não passam por tradução automática. Tema de interface e tema visual do vídeo são independentes: fundos, cores das letras e exportação não mudam ao trocar claro/escuro.

Verificação: `npx tsx --env-file=.env tests/preferences-browser.ts` (com o servidor e PostgreSQL locais disponíveis).

## Resolução de saída

Em **Exportar e arquivo → Resolução do vídeo**, escolha projetor XGA 4:3, HD, Full HD (padrão), QHD, 4K UHD, vertical 9:16, quadrado ou retrato 4:5. Em **Personalizado**, informe largura e altura e clique em **Aplicar resolução**. O preview e o MP4 usam as mesmas dimensões; salve o projeto para mantê-las. Desfazer/refazer também inclui mudanças de resolução.

Dimensões devem ser pares, entre 256 e 4096 px, com no máximo 8.294.400 pixels no total, para compatibilidade com H.264. A tipografia acompanha a escala da saída; mudanças de proporção podem alterar as quebras de linha. O MP4 continua sem áudio.

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

No desktop (a partir de 1024 px de largura e 640 px de altura), o editor ocupa a área útil da janela. O preview permanece visível; a timeline e as configurações têm rolagens independentes. As abas **Templates**, **Fundo**, **Tema**, **Texto** e **Animação** evitam uma lista longa de controles. Abaixo do preview, alterne entre **Slides e timeline**, **Áudio e sincronização** e **Exportar e arquivo**. As abas preservam os formulários e os processamentos em andamento. Em telas menores, o conteúdo volta ao fluxo vertical.

Use **Recolher menu** no canto superior esquerdo para ampliar a área de trabalho. Os ícones continuam acessíveis e **Expandir menu** restaura os rótulos. A preferência é lembrada neste navegador.

As ações usam notificações flutuantes no canto superior direito, sem deslocar o preview: verde para sucesso (4 s), vermelho para erro (7 s), amarelo para atenção (6 s) e azul para informação (5 s). Elas podem ser fechadas manualmente e pausam ao receber foco ou passar o mouse. Até quatro ficam visíveis; mensagens idênticas são agrupadas. O provedor global preserva as notificações durante a navegação. Progresso, resultados que exigem revisão e falhas persistentes do preview continuam junto da ferramenta correspondente; confirmações de exclusão continuam exigindo uma decisão explícita.

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

O endpoint de conteúdo suporta HTTP Range e exige sessão da igreja proprietária da mídia. O [sistema de contas](accounts.md) controla acesso a projetos, músicas, templates e uploads.

## MP4 local sem áudio

A interface já gera MP4 pelo servidor Node local. Alternativamente, em **Arquivo do projeto**, clique em **Baixar projeto editável (JSON)** e execute, na raiz:

```sh
npm run render:video -- caminho/projeto.json out/video.mp4
```

Mantenha o servidor acessível durante a renderização de fundos em imagem/vídeo: o arquivo JSON referencia URLs absolutas de mídia. Para renderizar em outra máquina, essas URLs devem ser acessíveis por ela. O Remotion pode baixar o Chrome Headless Shell na primeira execução.

O comando usa H.264/yuv420p e `muted: true`, não sobrescreve arquivos existentes e não adiciona trilha de áudio. A interface usa `POST /api/visual-projects/:id/export`, copia as mídias referenciadas para um diretório temporário privado e remove os arquivos ao concluir o download. Aceita uma renderização por processo; requisições simultâneas recebem 429. Mantenha a página aberta durante a geração. Pode baixar o Chrome Headless na primeira execução.

Esse fluxo requer Node, Chrome/FFmpeg e o repositório completo no servidor. A API exige autenticação e permissão de edição. Para SaaS público, é necessário mover a renderização para uma fila durável com workers e armazenamento compartilhado. Limites de tempo de plataformas serverless podem interromper vídeos longos. Antes da oferta comercial, verifique os termos de licença do Remotion para sua organização.

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

## Interface do Studio

A área interna usa o layout compartilhado `AppShell` e os estilos isolados de `studio.css`. O dashboard mostra contagens e os três projetos mais recentes da igreja ativa; as prévias usam o componente reutilizável `ProjectCard`, também usado na listagem de projetos. Os atalhos de criação seguem as permissões do usuário.

No desktop, o editor ocupa a altura disponível da janela, com preview estável e rolagem independente nas ferramentas e no inspetor. As abas têm ícones, navegação por setas, Home e End; o menu lateral pode ser recolhido e a preferência é mantida. No celular, o menu da conta fica no avatar do cabeçalho, incluindo troca de igreja e logout. Animações de interface respeitam a preferência por movimento reduzido.

Verificação visual adicional: `npx tsx --env-file=.env tests/studio-browser.ts` com o servidor local em execução e `REMOTION_BROWSER_EXECUTABLE` apontando para o Chrome. Os testes criam apenas dados sintéticos e os removem ao terminar.
