# Salvamento e proteção de saída do Editor Visual

O controle **Salvar automaticamente**, no cabeçalho, é opcional e começa desligado. A preferência `wls-editor-autosave` é lembrada neste navegador. Não altera preferências de outras pessoas no banco.

Quando habilitado, aguarda dois segundos sem novas alterações antes de salvar. Utiliza o mesmo endpoint autenticado do salvamento manual, com a revisão atual do projeto e as permissões existentes. Não altera o schema do banco. A edição continua disponível durante o salvamento automático; o status distingue alterações pendentes, salvamento e falha. Não gera um toast de sucesso a cada gravação automática.

## Consistência

- Requisições de salvamento são serializadas. Cada PUT utiliza a revisão devolvida pelo anterior.
- Somente o snapshot confirmado pelo servidor é marcado como salvo. Alterações feitas durante uma requisição continuam pendentes.
- Salvar e sair aguarda uma gravação em andamento e salva também alterações posteriores antes de navegar.
- Falha de rede, validação, sessão/permissão ou conflito 409 mantém a edição e a proteção de saída. Não há sobrescrita forçada de outra aba.
- Depois de uma falha, o salvamento automático fica suspenso para não repetir tentativas indefinidamente. Use **Salvar projeto** para tentar novamente ou desligue/ligue a opção.
- Aplicação do alinhamento pausa o autosave; a revisão salva pelo alinhamento atualiza a base local antes de qualquer nova gravação.

O formulário **Bloco selecionado** também participa: letra, seção e tempos ainda não aplicados são validados e incorporados ao salvar. Campos inválidos impedem o salvamento e mantêm o modal aberto. Mudar a decoração não destrói esse rascunho; trocar de slide ou repetir um bloco incorpora o rascunho válido primeiro. Atualizações externas dos tempos/estilos são mescladas sem apagar o texto que está sendo digitado.

## Saída

A navegação por links, o botão Voltar do navegador e as ações de sair da conta/trocar igreja pedem uma decisão quando há alterações pendentes:

1. **Salvar e sair**: navega somente depois da confirmação do servidor.
2. **Sair sem salvar**: abandona apenas alterações ainda não gravadas; não desfaz autosaves já concluídos.
3. **Continuar editando**: permanece na página. Escape também cancela a saída.

O modal usa `dialog.showModal()` para prender foco e tornar o restante da página inativo. Pausa novas tentativas de autosave enquanto a decisão está aberta; uma requisição já enviada precisa terminar antes de permitir descarte. O guard do botão Voltar usa uma entrada temporária com a mesma URL, preservando o estado do Next; a entrada é retirada antes da navegação autorizada ou quando o projeto fica salvo.

**Fechar/recarregar a aba ou digitar outra URL usa o aviso nativo do navegador**, via `beforeunload`. Os navegadores não permitem trocar esse aviso por um modal customizado com botão Salvar. Para salvar, o usuário escolhe permanecer e usa o editor. Avisos de saída não garantem recuperação após encerramento forçado, falha do sistema ou descarte da aba pelo sistema móvel. Não foi adicionado armazenamento offline das letras em localStorage.

## Testes

```powershell
$env:TEST_BASE_URL='http://localhost:3000'
$env:REMOTION_BROWSER_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
npx tsx --env-file=.env tests/editor-saving-browser.ts
```

O teste cria e limpa uma conta/projeto temporários. Cobre persistência opcional, rascunho de letra, troca de decoração durante a edição, alterações durante autosave, pausa durante a decisão de saída, validação inválida, cancelamento/descarte/salvamento, aviso nativo, logout cancelado, falha de conexão simulada, conflito entre abas, modal móvel e Voltar do navegador. Não altera projetos reais.
