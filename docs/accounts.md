# Contas, igrejas e permissões

Cada conta entra por e-mail e senha. O cadastro normal cria uma igreja e torna o usuário seu Responsável. O cadastro por convite entra na igreja indicada pelo convite. Uma conta pode participar de várias igrejas; a sessão mantém a igreja ativa, que pode ser trocada no menu lateral.

| Perfil | Consultar e preview | Criar/editar, uploads e gerar MP4 | Excluir músicas | Gerenciar equipe |
|---|---|---|---|---|
| Responsável | Sim | Sim | Sim | Todos os perfis |
| Administrador | Sim | Sim | Sim | Editores e Leitores |
| Editor | Sim | Sim | Não | Não |
| Leitor | Sim | Não | Não | Não |

Responsáveis e Administradores podem alterar o nome da igreja. Somente um Responsável promove outros Responsáveis ou Administradores. A igreja sempre mantém pelo menos um Responsável; alterações concorrentes de membros são serializadas por igreja. A remoção de um membro revoga suas sessões ativas naquela igreja. Mudanças de perfil são verificadas no próximo pedido, inclusive em sessões já abertas.

## Primeiro acesso e acervo anterior

A migração é aditiva e preserva músicas, projetos, templates e mídias anteriores em `legacy-church`. O cadastro público não recebe esse acervo automaticamente. Antes de aplicar a migração em outros ambientes, mantenha backup habitual do banco e de `.data/media`.

No servidor local, um operador pode gerar um convite de primeiro responsável para a igreja sem membros:

```sh
npm run accounts:invite-owner -- email@igreja.com.br
```

Abra o link retornado, informe seu nome, o e-mail convidado e uma senha de 12 a 128 caracteres. O convite expira em sete dias e só pode ser usado uma vez. A senha não precisa ser compartilhada com o operador. O comando recusa igrejas que já têm membros; responsáveis posteriores são gerenciados pela tela da equipe. O script só funciona com acesso administrativo local ao banco; não existe uma rota pública equivalente.

Se já criou uma conta normal e quer mover o acervo preservado para a igreja dessa conta:

```sh
npm run accounts:claim-legacy -- email@igreja.com.br [id-da-igreja]
```

O comando exige que o usuário já seja Responsável pela igreja selecionada. Move os registros em transação e preserva IDs, arquivos e vínculos. Não altera senhas. A migração não depende do nome/e-mail particulares da instalação local.

## Equipe e convites

Abra **Igreja e equipe** para gerar convites por e-mail e perfil, alterar funções e revogar convites pendentes. O link deve ser compartilhado manualmente; não há serviço de envio de e-mail nesta etapa. Usuários existentes podem escolher **Já tenho conta** no link e aceitar durante o login. O token é armazenado somente como hash e o e-mail deve coincidir com o do convite. Aceitar outro convite não promove um membro que já pertence à igreja.

## Autenticação e isolamento

- Senhas usam `scrypt` assíncrono, salt aleatório, `N=32768`, `r=8`, `p=3` e comparação de tempo constante, conforme as alternativas recomendadas pelo [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- Sessões são tokens opacos de 256 bits, com hash SHA-256 no PostgreSQL e validade de sete dias. Cookies são HttpOnly, SameSite=Lax e Secure em produção; o cookie de produção tem prefixo `__Host-`. Logout revoga a sessão. Trocar a senha exige a senha atual e revoga as demais sessões.
- Mutações verificam a origem exata. Em produção, **configure `APP_ORIGIN` com a URL HTTPS canônica**. Proxies precisam preservar o host e disponibilizar a aplicação apenas nessa origem. Não há lista permissiva de origens externas.
- Login e cadastro têm limites persistentes por e-mail e globais em janelas de 15 minutos. Configure retenção operacional para limpar `AuthRateLimit` cujo `resetAt` já expirou, sessões vencidas e convites expirados. O limite global de cadastro é 100/janela; o de login, 300/janela. São valores iniciais a acompanhar no deploy.
- Todas as operações de dados usam a igreja da sessão, nunca uma igreja escolhida no corpo do pedido. IDs de outro tenant não dão acesso a músicas, projetos, templates, mídias, alinhamentos ou renders. A mídia privada também exige sessão e não é enviada a caches públicos.
- Rotas e serviços validam acesso no servidor; controles da interface apenas complementam essa proteção. Consultas diretas ao banco por operadores/worker são privilegiadas e não passam pelo login da aplicação. O isolamento é implementado pela aplicação, sem PostgreSQL RLS nesta fase.

Ainda não fazem parte desta etapa: confirmação de e-mail, recuperação de senha por e-mail, MFA, SSO, cobrança ou quotas de assinatura. Não apresente o e-mail cadastrado como verificado; o convite prova posse do link compartilhado. Para recuperar uma conta, não exponha rotas administrativas sem autenticação: configure um serviço de e-mail antes de implementar recuperação pública.

## Verificação

```sh
npm run db:generate
npm exec -w @wls/database -- prisma migrate deploy
npm run typecheck
npm test
npm run test:accounts
npm run test:integration
```

Os testes de contas verificam duas igrejas isoladas, mídias privadas, papéis, convites, troca de igreja, revogação, CSRF, alteração de senha e remoção simultânea de responsáveis. Os testes anteriores agora usam contas sintéticas temporárias. Fixtures e registros de teste são removidos ao terminar. Não há senha padrão nem bypass de login para testes.
