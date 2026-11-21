# Cobrança Asaas — homologação local

Implementado em 13/11/2026. O catálogo permanece uma proposta comercial; somente **Sandbox** pode criar assinaturas. Produção é recusada pelo servidor, mesmo com chave de produção. Nenhuma franquia, bloqueio de acesso ou migração de clientes antigos foi ativada.

## O que funciona

- `/billing`: Responsável seleciona o plano e ciclo, informa nome e CPF/CNPJ fictícios e consente com o envio ao Sandbox. E-mail vem da sessão. Dados de cartão são preenchidos somente na fatura hospedada do Asaas.
- `POST /api/billing/checkout`: autenticação, OWNER, origem exata, limite de requisições, corpo limitado e schema estrito. Plano, preço e versão vêm do catálogo no servidor. Uma contratação por igreja/ambiente; novo plano/ciclo requer operação futura de troca, não criação duplicada.
- `GET /api/billing/status`: situação local e link seguro, sem consultar o provedor. `POST` concilia com o Asaas, incluindo funcionamento em localhost sem webhook público.
- `POST /api/billing/webhooks/asaas`: autentica `asaas-access-token` em comparação constante, corpo máximo de 64 KiB, IDs validados e deduplicação durável. Consulta assinatura e pagamento canônicos; confere cliente, referência, valor, ciclo e forma de pagamento. Não guarda payloads com cartão/documentos. Eventos estranhos à integração não concedem acesso.
- Migração aditiva `20261113180000_billing_sandbox`: contrato, faturas e eventos. Locks por assinatura serializam conciliação e webhook. A última competência vencida determina a situação; cobrança futura não antecipa ativação. Situação registrada não aplica quotas nem concede privilégios novos.
- Timeout de criação preserva a intenção em `UNKNOWN`. A conciliação procura pela referência `wls:<id>` sem repetir POST. Se não houver confirmação única, exige revisão operacional. Não remova o registro local para tentar novamente sem verificar o provedor.
- Pix é oferecido na fatura boleto/Pix. Esta conta Sandbox normaliza a recorrência para `BOLETO`; o servidor usa esse tipo e verifica a disponibilidade de QR Code antes de devolver o checkout Pix. Não se trata de Pix Automático.
- Estornos parciais/listas de reembolso ficam em revisão conservadora. Cancelamento de recorrência é feito no painel Sandbox e conciliado aqui. Troca de plano, cancelamento pelo Studio, direito de uso por período pago, franquias e ativação em produção são etapas seguintes.

## Ambiente local

```dotenv
APP_ORIGIN="http://localhost:3000"
ASAAS_ENVIRONMENT="sandbox"
ASAAS_API_KEY='valor-secreto-configurado-localmente'
ASAAS_WEBHOOK_TOKEN="token-proprio-aleatorio-de-32-a-255-caracteres"
```

Use aspas **simples** para a API key: seu prefixo `$` é interpretado pelo Docker Compose dentro de aspas duplas. Não use `NEXT_PUBLIC_`, não versione `.env`, não imprima variáveis ou respostas integrais do provedor. Reinicie o servidor após alterar o ambiente. A origem usada no navegador deve coincidir com APP_ORIGIN (localhost e 127.0.0.1 são origens diferentes).

```powershell
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npm run db:generate
npm run dev
```

Se a DLL Prisma estiver em uso no Windows, pare somente o servidor deste projeto, gere o cliente e reinicie. A migração não modifica músicas nem projetos existentes.

## Webhook externo

Asaas não alcança localhost. Publique este código em hospedagem HTTPS ou abra um túnel temporário explicitamente autorizado. O endpoint continua exigindo o token; não basta a URL ser pública. Para o ambiente público persistente, configure APP_ORIGIN com a origem exata da aplicação e ASAAS_WEBHOOK_EMAIL com um e-mail operacional.

```powershell
npm run billing:webhook
npm run billing:webhook -- --register
```

O primeiro comando verifica o endpoint público autenticado e a configuração existente. O segundo cadastra somente se não houver webhook com essa URL. O comando recusa produção/localhost, não segue redirecionamentos e não imprime credenciais. Um webhook existente divergente exige revisão, não é silenciosamente alterado. Não execute provisionamento concorrente. Eventos incluem criação, alteração, pagamento, atraso, exclusão, restauração, estornos, chargeback e mudanças de assinatura.

Em teste com túnel, pode-se definir APP_ORIGIN apenas no processo do provisionador para a URL temporária, preservando a origem local do servidor e os testes autenticados locais. O webhook não usa sessão/CSRF. Depois do teste, remova o webhook criado por esse teste antes de fechar o túnel; uma URL efêmera não deve permanecer cadastrada como integração permanente.

## Validação

- `npm test`: validações, tokens, URLs, limites de payload, preços e estados.
- `npm run test:billing-local`: PostgreSQL local + Asaas simulado; contratação concorrente, timeout após criação, conciliação, deduplicação, valor divergente, estorno e eventos fora de ordem. Cria e limpa apenas fixtures locais.
- `npx tsx --env-file=.env tests/billing-browser.ts`: UI, consentimento, preços, móvel e OWNER, sem chamadas de cobrança.
- `npm run test:billing-sandbox`: **opt-in**, cria clientes fictícios, assinaturas e faturas no Sandbox. Exige autorização operacional. Não efetua pagamentos reais. Remove as fixtures e cancela as assinaturas de teste ao final; em falha de limpeza, mantenha os IDs locais até resolver.
- `REQUIRE_EXTERNAL_WEBHOOK=true`: exige observar `PAYMENT_CREATED` real na base antes de continuar o teste externo. O webhook precisa estar cadastrado e o túnel/hospedagem acessível.

A homologação de geração da fatura não equivale à captura de cartão, liquidação Pix/boleto ou aprovação para produção. Pagamentos aprovados/recusados, renovação, chargeback e custos reais exigem homologação financeira adicional. Não habilitar produção com base apenas no HTTP 200 da chave.

### Resultado desta execução

Em 13/11/2026, a geração de faturas hospedadas para Pix, boleto e cartão passou no Sandbox. O evento `PAYMENT_CREATED` de cada modalidade foi entregue pelo Asaas por um túnel HTTPS temporário e persistido no banco. Repetições de checkout não duplicaram a assinatura, eventos repetidos foram deduplicados e status/valor forjados no payload não substituíram os dados canônicos. Assinaturas de teste foram canceladas, clientes fictícios e fixtures locais foram removidos. O webhook temporário foi removido e o túnel encerrado. APP_ORIGIN local foi preservado; não existe webhook público permanente enquanto a aplicação continuar somente em localhost.

Referências: [assinaturas](https://docs.asaas.com/docs/criando-uma-assinatura), [formas de pagamento recorrentes](https://central.ajuda.asaas.com/hc/pt-br/articles/54672181332379-Quais-s%C3%A3o-as-formas-de-pagamento-dispon%C3%ADveis-para-cobran%C3%A7as-por-assinatura), [QR Code compatível com boleto](https://docs.asaas.com/reference/obter-qr-code-para-pagamentos-via-pix), [eventos de cobrança](https://docs.asaas.com/docs/webhook-para-cobrancas).
