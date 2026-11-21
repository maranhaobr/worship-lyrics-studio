# Recuperação de falhas de alinhamento

## Pareamento de refrões — 19/11/2026

O matcher por blocos contíguos podia escolher uma ocorrência posterior de um refrão por ter uma transcrição mais limpa e pular uma repetição intermediária. Isso comprimia dezenas de palavras em uma janela curta, acionando incorretamente a validação de espaço/repetições. O pareamento agora maximiza correspondências exatas na ordem global (subsequência comum máxima), preservando os tempos reconhecidos. Não insere, remove ou troca frases da letra.

O cálculo usa tabela compacta de inteiros com limite de 4 milhões de células (~16 MB). Para entradas excepcionalmente grandes, mantém o matcher anterior como fallback de memória limitada para a tabela; portanto o ganho de pareamento global não é garantido nesse caso. Tokens vazios após normalização não formam âncoras.

A transcrição cara permanece compatível no cache. Checkpoints de alinhamento usam uma nova versão de pareamento para não reutilizar resultados com associações antigas. Os testes incluem refrões repetidos com erro de transcrição nas primeiras ocorrências e uma ocorrência final mais precisa, que antes atraía os blocos anteriores. Validações contra letra incompatível e múltiplas frases sem correspondência permanecem ativas.

Na gravação reportada de “Como não confiar em Ti”, o matcher anterior encontrou 165 correspondências e comprimiu o slide 37 a aproximadamente 0,16 segundo. O novo pareamento encontrou 217 correspondências na mesma transcrição. O reprocessamento concluiu os 58 slides em 165 segundos, sem remover letras nem modificar o projeto. O slide 37 foi alinhado de 161.888 a 166.080 ms. A timeline passou pela validação em memória; nenhum slide recebeu posição inteiramente provisória. Há 52 avisos de confiança, portanto o resultado permanece para revisão e aplicação manual no editor. Os 18 testes Python passaram no worker.

Correção de 14/11/2026 para o caso de um único trecho sem tempos válidos interromper uma música inteira.

O worker mantém a transcrição integral, a busca das frases na ordem e o alinhamento forçado. Se uma frase falhar na conversão dos tempos, tenta primeiro as palavras e os tempos reconhecidos pelo ASR dentro da janela daquela frase. Resultados dessa fonte são marcados para revisão.

Quando não há reconhecimento suficiente, apenas uma janela intermediária de até 12 segundos pode receber tempos **provisórios**, com aviso contendo slide e intervalo. A entrada vocal e a última frase nunca recebem essa aproximação. A quantidade de slides provisórios é limitada (no máximo um ou aproximadamente 14% dos slides). A correspondência global mínima entre letra e áudio continua obrigatória. Áudio incompatível, janela excessiva, erro técnico do modelo ou muitas frases não reconhecidas continuam produzindo erro. Um resultado com aproximação não equivale a sincronização precisa.

No editor, o resultado sinaliza quantos slides não foram reconhecidos, mostra todos os avisos em uma lista rolável e exige reconhecer a necessidade de revisão antes de aplicar. Os tempos não são aplicados automaticamente. O schema rejeita resultados provisórios sem aviso/revisão. Projetos e resultados antigos continuam compatíveis.

## Reaproveitamento de processamento

O diretório privado `/models/alignment-artifacts` no volume `alignment_models` guarda:

- Transcrição completa, incluindo palavras e tempos, logo após reconhecer o áudio.
- Checkpoints dos slides alinhados, gravados à medida que terminam.

A chave usa SHA-256 do conteúdo do áudio, modelo e versão da política. Os checkpoints incluem o texto e a janela exata. Outro áudio, modelo, texto ou janela não reutiliza dados incompatíveis. IDs dos slides são remapeados para o projeto atual. Posições provisórias não são reutilizadas como se fossem alinhamentos medidos.

O cache expira em 30 dias, tem limite de 10 mil arquivos e faz escrita atômica. Contém letra reconhecida e tempos; é privado do worker, não deve ser servido por HTTP nem incluído em commits/backups públicos. Não guarda cópias de áudio. Se o cache estiver indisponível ou corrompido, o worker processa novamente. Para produção, definir retenção por organização e limpeza periódica independente de novos jobs.

O benefício vale para tentativas **após** esta correção: transcrições de tarefas antigas não foram guardadas. A primeira execução ainda exige reconhecimento integral. CPU continua limitada a duas CPUs; não há promessa de redução do tempo da primeira tentativa. Depois de uma falha, alterar apenas a letra pode reaproveitar a transcrição; slides com texto e janelas inalteradas também aproveitam checkpoints.

Antes do alinhamento forçado, três slides seguidos sem correspondência ou uma janela curta demais para a frase geram um diagnóstico antecipado com o número do slide. Isso evita gastar minutos tentando encaixar um bloco repetido que não aparece nessa versão da gravação.

O progresso agora avança conforme os segmentos transcritos, e o editor distingue preparação, reconhecimento e sincronização. Percentual não é uma previsão de tempo restante. Logs registram cache hit e duração das etapas, sem transcrever a letra nos logs de desempenho.

## Verificação

```powershell
$env:PYTHONPATH='services/alignment'
python -m unittest discover -s services/alignment/tests -v
npm test
npm run typecheck
```

Os testes cobrem fallback para ASR, posição provisória explicitamente marcada, proteção da introdução, repetição sem nova transcrição, reaproveitamento de slides com IDs diferentes, chave por conteúdo/modelo/janela e cache corrompido/expirado.

## Verificação na gravação reportada

Na tarefa original, 87 slides falharam após aproximadamente 7min51s. A análise identificou uma repetição do primeiro bloco nos slides 23–38 sem correspondência na transcrição daquele ponto. Com autorização do usuário, esses 16 slides foram removidos do projeto, preservando os demais textos e estilos e salvando a revisão anterior em `.data/alignment-backups`. O reprocessamento local com cache concluiu 71 slides em 112 segundos. O resultado passou pelo schema e por `applyAlignment` em memória; não foi aplicado automaticamente. Nenhum slide recebeu posição inteiramente provisória, mas 56 têm avisos de confiança e exigem revisão. Esses números são desta gravação e desta sequência corrigida, não um benchmark geral de desempenho ou precisão.
