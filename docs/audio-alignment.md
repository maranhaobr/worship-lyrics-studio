# Alinhamento de áudio separado

## Iniciar

```sh
npm install
npm run db:generate
npm exec -w @wls/database -- prisma migrate deploy
npm run alignment:up
npm run dev
```

No Windows, pare o Next antes de `db:generate` se a DLL do Prisma estiver em uso. O serviço Python usa CPU por padrão, com dois threads/núcleos, modelos locais em português e sem chave de API paga. A primeira tarefa baixa os modelos ASR/Whisper e wav2vec2; o volume `alignment_models` guarda o cache. A imagem e os modelos usam alguns GB e precisam de acesso à internet na instalação/primeira execução. O processo não envia os áudios para serviços externos.

O perfil é opcional: `docker compose up -d` continua subindo apenas o PostgreSQL. A aplicação web não precisa esperar o carregamento dos modelos. A imagem inicial é CPU; GPU exige imagem/configuração CUDA apropriadas.

`alignment:up` reutiliza a imagem instalada e verifica pelo menos 12 GB livres antes de uma construção nova. Para atualizar dependências, use `npm run alignment:up -- --build` após liberar esse espaço. O Compose de desenvolvimento monta `services/alignment/app` somente para leitura, permitindo atualizar código Python com reinício do worker sem baixar novamente as dependências. Os modelos e as dependências já instalados não exigem novo build para iniciar o serviço.

## Usar

1. Abra o projeto visual e localize **Sincronizar com a música**.
2. Envie MP3, WAV ou M4A, até 50 MB e uma hora. A duração e a presença de áudio são verificadas no servidor com FFprobe.
3. Salve o projeto e clique em **Alinhar letra automaticamente**.
4. Aguarde a tarefa. Pode fechar/reabrir a página: a fila e o resultado ficam no PostgreSQL.
5. Confira os avisos e clique em **Aplicar tempos à timeline**. Ajuste manualmente os trechos necessários e gere uma nova versão do MP4.

O preview reproduz o áudio de referência junto da composição, inclusive ao buscar um ponto da timeline. A composição de exportação não contém esse áudio; o renderer também usa `muted: true`.

A letra deve conter a sequência realmente cantada, incluindo repetições. O sistema não expande “repetir refrão 2x”, não inventa improvisações, não separa voz/instrumentos e não garante precisão perfeita em canto, corais ou gravações com muito acompanhamento. Deve ser avaliado com gravações reais do público alvo; o teste automático com voz sintética verifica a integração, não mede qualidade de alinhamento musical.

## Processo e limites

- `AlignmentJob` registra o snapshot da letra, áudio, estado, tentativas, progresso e resultado.
- O worker reivindica tarefas com `FOR UPDATE SKIP LOCKED`, permitindo múltiplas instâncias sem duplicar o processamento normal.
- Um heartbeat renova a concessão. Se o processo morrer, tarefas sem heartbeat por cinco minutos são recuperadas; após três tentativas interrompidas, ficam como falha.
- Um token de concessão impede que um worker antigo publique resultados após cancelamento ou reatribuição.
- Só há uma tarefa ativa por projeto, garantida por índice parcial único no PostgreSQL.
- O reconhecimento de voz encontra referências temporais; a comparação sequencial com a letra delimita janelas locais. O alinhamento forçado mede tempos das palavras nessas janelas.
- A transcrição mantém a gravação inteira, sem filtro de atividade de fala (VAD), pois esse filtro pode descartar voz cantada junto do acompanhamento. O processamento em CPU pode levar vários minutos.
- Trechos com palavras interpoladas/baixa pontuação são sinalizados. Se uma frase não puder ser reconhecida com segurança, a tarefa falha em vez de apresentar tempos estimados como sincronização medida.
- Aplicar altera apenas tempos e duração, preservando IDs, letra, seções, estilos e fundos dos slides. Marcadores antigos de seção são excluídos da timeline alinhada.
- Alterações visuais salvas durante o processamento podem ser mescladas. Alterações de letra, áudio, duração ou tempos manuais exigem novo alinhamento. Uma revisão otimista protege contra outras abas.

O resultado exige aplicação explícita. Cancelar impede a publicação do resultado; uma operação nativa de inferência em andamento pode terminar antes de o worker detectar o cancelamento.

## Armazenamento e produção

O Next e o worker compartilham `.data/media`; o worker monta esse diretório somente para leitura. Se definir `MEDIA_STORAGE_DIR`, use um caminho absoluto acessível ao Docker Desktop. O endereço do PostgreSQL dentro do Compose usa `postgres:5432`; o app no host usa a porta publicada `5433`.

O worker não publica HTTP nem precisa de token de usuário/Hugging Face para diarização, pois não faz diarização. O banco atual usa credenciais locais de desenvolvimento. A aplicação exige sessão e permissão de edição, com isolamento por igreja. Antes de hospedar o SaaS, implemente quotas, retenção de áudio e armazenamento compartilhado. Consulte [contas e permissões](accounts.md) para configuração da origem HTTPS e convites. Workers podem ser escalados separadamente do Next.

## Diagnóstico e testes

```sh
docker compose logs -f alignment-worker
npm test
npm run typecheck
```

Os testes Python são independentes dos modelos e podem ser executados em `services/alignment`:

```sh
python -m unittest discover -s tests -v
```

No Windows com voz pt-BR instalada:

```powershell
powershell -ExecutionPolicy Bypass -File tools/create-alignment-fixture.ps1
npm run test:alignment
npm run test:alignment-worker
```

`test:alignment` verifica o contrato da API usando tempos sintéticos. Para executá-lo de forma determinística, pare o worker durante esse teste. `test:alignment-worker` usa os modelos reais com a gravação sintética e verifica a introdução silenciosa e a pausa entre frases. O último teste exige o worker ativo e pode demorar na primeira execução. Ambos removem os projetos e áudios criados por eles. O teste de renderização também verifica que adicionar áudio de referência não cria uma faixa de áudio no MP4.
