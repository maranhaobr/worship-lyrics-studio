# Integração ProPresenter

## Importar para o Studio

Em **Biblioteca → Importar ProPresenter**, selecione um `.pro` de até 5 MB. A leitura mostra o título, grupos, slides e avisos antes de salvar qualquer dado. Escolha **Importar na biblioteca** ou **Importar e abrir editor visual**. Um slide com várias linhas continua sendo um único slide no projeto visual. Os tempos começam estimados; depois envie o áudio para sincronizar.

O importador usa os grupos do arquivo. Quando existe um arranjo selecionado, segue sua ordem e repetições; grupos fora desse arranjo não são acrescentados. Slides avulsos sem grupo são incluídos ao final. Slides vazios, desabilitados e marcadores de seção são omitidos com aviso. Não há edição do arquivo original nem acesso às mídias externas referenciadas. A página de importação não salva automaticamente; cada importação confirmada cria uma nova música.

O limite atual é de 100 seções, 100 slides por seção e 500 caracteres por slide. Grupos longos são divididos em partes de até 100 slides. Um slide que excede 500 caracteres deve ser dividido no ProPresenter. Os campos de letra do editor de músicas usam quebras de linha para editar a estrutura; para preservar slides multilinha sem redivisão, abra diretamente o projeto visual a partir da importação.

## Exportar para o ProPresenter

- Na música salva, use **Exportar para ProPresenter (.pro)**. Salve antes para incluir alterações.
- No editor visual, abra **Exportar e arquivo → ProPresenter**. A exportação usa o snapshot atual dos slides, inclusive alterações visuais ainda não salvas, e o nome salvo do projeto. Apenas texto e grupos são transferidos; os estilos visuais desse snapshot não são exportados.

O arquivo contém uma apresentação nova com UUIDs novos, grupos e slides de texto editável, em 1920×1080, fonte Arial e fundo preto. A abertura/importação no ProPresenter precisa ser validada na versão utilizada pela igreja. Não é um pacote `.proBundle` e não contém mídia, automações, transições ou timeline sincronizada. Para reproduzir exatamente fundos e efeitos do Studio, exporte o MP4 e use-o como vídeo no ProPresenter.

A exportação inclui a identidade de aplicação de cada grupo (`application_group_identifier` e `application_group_name`) e usa a ordem original implícita do ProPresenter, sem criar um arranjo personalizado. Os objetos de texto incluem o caminho retangular com quatro pontos, forma, preenchimento, contorno, sombra e feather, mesmo quando os efeitos estão desativados. A primeira versão omitia essas estruturas: o ProPresenter exibia um arranjo vazio e seu log registrou `NullReferenceException` em `ElementHelper.GetElementFromGraphicsType` ao tentar carregar os objetos. Os testes agora verificam essas estruturas nativas, além da releitura do texto. Arquivos exportados por essa versão precisam ser gerados novamente; a correção não regrava arquivos já importados na biblioteca do ProPresenter. A conferência visual final no aplicativo permanece necessária após reabri-lo caso a versão anterior tenha causado uma exceção.

## Formato e limites de compatibilidade

Esta implementação lê o formato binário Protocol Buffers de apresentações `.pro` do ProPresenter 7, usando um subconjunto dos campos públicos documentados pelo projeto independente [ProPresenter7-Proto](https://github.com/greyshirtguy/ProPresenter7-Proto). As definições não são uma especificação oficial nem uma integração homologada pela Renewed Vision. A licença MIT da fonte está em `apps/web/src/lib/propresenter/LICENSE`. Campos desconhecidos são ignorados; ações, mídias, notas, estilos, fontes e horários do arquivo não são importados. Arquivos XML legados `.pro5`/`.pro6`, ZIP e `.proBundle` não são aceitos.

O texto é extraído somente dos objetos visíveis de slides habilitados. O leitor RTF trata Unicode, escapes Windows-1252/Macintosh e quebras de linha; ignora tabelas, metadados, imagens e objetos. Codificações não suportadas e arquivos corrompidos retornam erro explícito, sem persistência parcial.

## Validação

```sh
npm test
npm run typecheck
npm run test:propresenter
```

Opcionalmente, defina `PROPRESENTER_SAMPLE` com um caminho local de `.pro` para executar o teste de API com esse arquivo. Os testes criam e removem somente seus próprios registros. A amostra fornecida **Vento novo.pro** foi lida com 52 slides, exportada e reimportada sem perda de texto, quebras e grupos. O arquivo original não é incluído no repositório. Esses testes validam o formato e a integração do Studio; não substituem a abertura do arquivo no aplicativo ProPresenter.
