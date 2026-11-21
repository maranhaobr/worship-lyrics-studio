# Seleção múltipla na timeline

- Ctrl/Cmd + clique ou espaço/Enter alterna um bloco na seleção.
- Shift + clique ou espaço/Enter seleciona o intervalo desde o último bloco usado como âncora.
- Selecionar vários exibe caixas de seleção e permite adicionar blocos sem tecla modificadora. Arrastar o corpo de um selecionado move todo o grupo.
- Selecionar todos e Limpar seleção estão disponíveis na barra. Ctrl/Cmd+A e Escape funcionam com um bloco da timeline focado.
- Setas deslocam o grupo em 100 ms; Shift+seta, em 1 segundo. Botões −0,1s/+0,1s permitem deslocamento sem arraste.
- Arrastar uma borda ajusta somente aquele bloco, voltando à seleção individual.

O grupo recebe um único deslocamento, preservando duração, distâncias e tempos relativos das palavras. O deslocamento é limitado por todos os vizinhos não selecionados e pelo início/fim do vídeo, inclusive com seleção descontínua. Não empurra outros slides nem aumenta a duração total. Um arraste confirma uma única alteração e um único Desfazer. Cancelar o gesto não altera o documento. A seleção é temporária; apenas os tempos são persistidos.

Validação: `npm test`, `npm run typecheck` e `tests/timeline-selection-browser.ts`. O teste de navegador usa um projeto temporário para conferir Ctrl, Shift, caixas de seleção, arraste por eventos reais de ponteiro, Desfazer, deslocamento e persistência, sem modificar projetos reais.
