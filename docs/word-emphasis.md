# Destaque de palavras

No editor, abra **Texto → Palavras em destaque**. Ative a opção para destacar JESUS, DEUS e SANTO ou informe outras palavras separadas por vírgula. A seleção respeita o escopo do editor (slide selecionado ou visual padrão).

O destaque permite escolher fonte, peso, cor, tamanho relativo, caixa alta e posição na frase ou em uma linha própria. O template **Destaque · Nome acima de tudo** combina Montserrat branco com Oswald amarelo em linha própria.

As correspondências são palavras completas, sem diferenciar maiúsculas, acentos ou pontuação nas bordas. “Deus” não destaca “deuses”. O texto e os tempos originais são preservados. Projetos antigos continuam sem destaque até a ativação.

O pulso de entrada usa o tempo de cada palavra; a precisão depende da sincronização existente. O pulso no BPM usa o relógio global e o BPM/deslocamento manual da aba Tema, sem detectar batidas no áudio automaticamente. Ambos são determinísticos ao buscar na timeline e na exportação.

Preview e MP4 usam o mesmo componente Remotion. Fontes locais não exigem serviços externos. Confira frases longas e tamanhos maiores no preview, principalmente em formatos estreitos.

Validação: `npm run typecheck`, `npm test` e `npx tsx tests/word-emphasis-render.integration.ts` (Chrome local configurável via `REMOTION_BROWSER_EXECUTABLE`). As amostras ficam em `out/word-emphasis`.
