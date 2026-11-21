# Monetização — proposta de lançamento

> Atualização: checkout, persistência, conciliação e endpoint de webhook **Sandbox** foram implementados depois desta proposta. Consulte [o estado operacional e as limitações atuais](./asaas-sandbox.md). O texto abaixo registra o planejamento original; produção e aplicação de quotas continuam desativadas.

Status em 13/11/2026: política em revisão, provedor escolhido Asaas. O usuário escolheu a faixa de lançamento de R$ 49/R$ 99/R$ 199 para validação; as franquias e a ativação comercial ainda precisam de validação de custo. O catálogo está em `packages/shared/src/billing/plans.ts`, versão `2026-11-draft-1`. A área `/billing` permite revisar a proposta e simular custos. Somente o Responsável da igreja acessa a tela. Não há checkout, assinatura persistida, cobrança ou aplicação de limites nesta etapa; configurar as variáveis não ativa esses recursos. Não foram publicados preços na landing.

## Modelo comercial

Uma assinatura por igreja, compartilhada entre os membros autorizados. Cobrar pelo valor entregue à equipe, com franquias para os recursos que geram custo. Todos os planos incluem as funcionalidades existentes do editor, templates, fundos, ProPresenter e personalização. Não vender recursos futuros como se estivessem disponíveis.

| Proposta | Mensal | Anual, pagamento único | Pessoas | Projetos ativos | Créditos de exportação/mês | Sincronização/mês | Armazenamento | Resolução |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Essencial | R$ 49 | R$ 490 | 3 | 20 | 120 | 60 minutos | 5 GiB | Até Full HD |
| Pro | R$ 99 | R$ 990 | 10 | 100 | 300 | 180 minutos | 20 GiB | Até 4K |
| Avançado | R$ 199 | R$ 1.990 | 25 | 300 | 800 | 480 minutos | 50 GiB | Até 4K |

O anual corresponde a dez mensalidades por doze meses de serviço: desconto de aproximadamente 16,67%, não 20%. Franquias de processamento renovam mensalmente, inclusive no anual, e não acumulam. Armazenamento, pessoas e projetos são limites simultâneos, não créditos renováveis. Na tela, GB significa 1.024³ bytes. O plano Pro é uma sugestão de posicionamento, não uma preferência observada de clientes.

Teste proposto: 14 dias sem cartão, 2 pessoas, 5 projetos, 1 GiB, 30 créditos, 15 minutos de sincronização e Full HD. Contas anteriores devem ter acesso preservado durante a transição, com aviso e prazo antes de qualquer bloqueio. Não migrar silenciosamente os dados atuais para um teste expirável.

Evitar um plano gratuito permanente com processamento livre. Para eventos esporádicos, avaliar futuramente pacotes pré-pagos depois de medir conversão e custo. Sem excedente automático: oferecer upgrade ou compra explícita, nunca cobrar além do combinado sem autorização. Não oferecer 4K ilimitado ou prometer margem antes do benchmark.

## Unidade de consumo proposta

Exportação: `ceil(minutos × max(0,5; pixels / 2.073.600))`, mínimo de um crédito por geração. Full HD de 5 minutos custa 5 créditos; 4K de 5 minutos, 20 créditos; HD de 5 minutos, 3 créditos. O editor mantém 30 fps; se isso mudar, versionar a regra. A resolução real do documento validado e a duração inspecionada devem ser usadas no servidor, nunca um consumo enviado pelo navegador.

Editar, usar o preview e baixar novamente um arquivo já gerado não devem gastar processamento adicional. Cada nova renderização solicitada consome franquia. Reservar a quota antes do job, confirmar no sucesso e devolver em falha técnica. O render atual é síncrono e apaga o arquivo ao terminar a resposta; downloads reutilizáveis exigem armazenamento e retenção de resultados, ainda não implementados.

Sincronização: minutos arredondados da gravação inspecionada. Reservar antes de enfileirar, registrar início e resultado, liberar reserva em cancelamento anterior ao processamento ou falha técnica. Erros de gravação/letra enviados pelo usuário precisam de uma política explícita de reprocessamento. A medição deve registrar consumo e diagnóstico, sem depender de a tela permanecer aberta.

Prévia do Pro em Full HD: 300 créditos permitem até 60 gerações de 5 minutos. Isso não equivale a 60 músicas novas se houver revisões. Uma igreja com 4 músicas de 5 minutos em 4 celebrações mensais usa 80 créditos por versão e 80 minutos de alinhamento; duas gerações por música usam 160 créditos. Essa hipótese ajuda a explicar a proposta de Pro, não comprova utilização real.

## Margem e validação

O simulador da tela usa hipóteses editáveis. Os valores iniciais (4% + R$ 0,50 por recebimento, 6% de tributos, R$ 25 de variável por igreja, R$ 500 fixos/mês e 50 igrejas) são exemplos matemáticos, **não tarifas Asaas, alíquotas indicadas ou orçamento de hospedagem**. Eles não foram obtidos da conta do usuário. Informe taxas efetivas da conta e custos próprios antes de aprovar os preços. O anual exige simular receita equivalente e taxas do recebimento anual separadamente; o simulador atual é mensal.

Com as hipóteses ilustrativas iniciais, o Essencial de R$ 49 resulta em R$ 8,60 (17,6%) por igreja; Pro de R$ 99, em R$ 53,60 (54,1%); Avançado de R$ 199, em R$ 143,60 (72,2%). O mesmo custo variável foi usado apenas para comparação; o custo real tende a variar por plano e utilização. Isso reforça que a faixa escolhida deve ser validada em piloto, especialmente o Essencial, sem aumentar franquias ou dar desconto adicional antes de medir.

`resultado por igreja = receita − taxa percentual − taxa fixa − tributos − variável − fixos/igrejas pagantes`.

Medir: CPU/GPU-segundos por minuto em HD/Full HD/4K, RAM, duração/falhas/repetições, tempo de alinhamento por minuto, armazenamento, tráfego de download, e-mail, suporte humano e licenças. Testar músicas longas, fundos em vídeo e picos simultâneos. Validar cenário médio e alto uso, não só uma demonstração curta. O simulador pode mostrar resultado negativo com poucas igrejas; faturamento não é lucro.

A versão instalada é Remotion 4.0.541. A licença aplicável fica em `node_modules/remotion/LICENSE.md`; verificar elegibilidade e eventual contrato comercial antes de fechar o orçamento. A página geral de termos aponta atualmente para um documento futuro da versão 5; não tratá-lo como contrato desta versão. Referências: [licenciamento](https://www.remotion.dev/docs/license/pricing) e [termos da versão 4](https://www.remotion.dev/docs/terms-4-0).

## Asaas: configuração e fluxo a implementar

Asaas escolhido para o lançamento brasileiro. A documentação distingue [assinaturas com cobranças periódicas](https://docs.asaas.com/docs/assinaturas) de [Pix Automático](https://docs.asaas.com/docs/pix-automatico). Pix/boleto em uma assinatura não significam débito automático: o cliente ainda paga cada cobrança. Cartão recorrente e Pix Automático também não são o mesmo fluxo. Começar com assinatura mensal, usando página hospedada para não receber dados de cartão no Studio. Validar o comportamento da página hospedada para cada modalidade na homologação.

Preparação no ambiente do servidor (sem `NEXT_PUBLIC_`):

```dotenv
ASAAS_ENVIRONMENT=sandbox
ASAAS_API_KEY=configure-no-ambiente-seguro
ASAAS_WEBHOOK_TOKEN=token-proprio-aleatorio-de-32-a-255-caracteres-sem-espacos
APP_ORIGIN=https://origem-publica-da-homologacao
```

A chave e o token são diferentes. O token do webhook nunca deve ser a API key. A tela mostra somente nomes das variáveis ausentes, nunca seus valores. Variáveis presentes não provam que o provedor está conectado, que a conta foi aprovada ou que uma cobrança funciona. Não há chamadas Asaas nesta etapa.

As [taxas Asaas](https://www.asaas.com/precos-e-taxas) podem depender da conta e de condições promocionais. Consultar as taxas efetivas, sem construir a margem a partir de um período promocional temporário. Este planejamento não cadastrou produtos ou clientes no Asaas nem movimentou dinheiro.

## Implementação incremental seguinte

1. **Validar política e custos:** aprovar preços, franquias, prazo de teste, anual e regra para contas atuais. Rodar benchmark. Depois publicar planos na landing com a mesma fonte de dados, em PT/EN/ES, explicando que a cobrança inicial é em BRL.
2. **Persistência:** modificar `packages/database/prisma/schema.prisma` e criar migração aditiva para `ChurchSubscription`, `BillingInvoice`, `BillingEvent` e `UsageReservation`. Guardar IDs externos únicos, preço/política contratados, ciclo financeiro, datas de competência e deduplicação. Cada igreja tem uma única assinatura corrente. Guardar eventos mínimos para auditoria, sem dados de cartão.
3. **Assinaturas sandbox:** criar `apps/web/src/lib/billing/asaas.ts`, `subscription-service.ts` e `/api/billing/checkout`, `/api/billing/cancel`, `/api/billing/status`. Somente OWNER contrata/cancela, com origem validada, igreja da sessão e preços do catálogo no servidor. Persistir intenção antes da chamada externa; impedir assinaturas duplicadas; tratar timeout como estado incerto a reconciliar, não repetir cegamente. Coletar apenas dados de cobrança necessários e usar a página hospedada do Asaas.
4. **Webhook:** criar `/api/billing/webhooks/asaas`. Autenticar o header `asaas-access-token`, limitar tamanho de corpo, deduplicar eventos em transação e consultar o objeto canônico no Asaas antes de liberar acesso. Validar cliente, assinatura e valor contratados. Não usar URL de retorno como comprovante de pagamento. Eventos duplicados/fora de ordem, estornos e chargebacks devem ser conciliados. Referências: [assinaturas](https://docs.asaas.com/reference/criar-nova-assinatura), [webhooks](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook) e [eventos de cobrança](https://docs.asaas.com/docs/webhook-para-cobrancas).
5. **Franquias no servidor:** criar `quota-service.ts` com reserva transacional por igreja e período. Integrar `render-video.ts`, `alignment-data.ts`, o worker Python, `media-data.ts`, criação de projetos e convites/aceitação de membros. Somar reservas pendentes antes de admitir novos jobs. Confirmar/liberar exatamente uma vez. Armazenamento e assentos incluem operações concorrentes e convites pendentes. O downgrade não apaga conteúdo; acima do limite, impedir novas alocações e manter leitura/download conforme a política aprovada.
6. **Jobs e operação:** mover renderização síncrona para fila durável com status/progresso, resultados temporários reutilizáveis, limpeza por retenção e limites de concorrência. Monitorar custo real e reconciliação diária com Asaas. Falha do gateway não deve apagar conteúdo nem renovar gratuitamente sem registro.
7. **Ativação controlada:** homologar pagamento aprovado/recusado/atrasado, renovação, Pix, boleto, cancelamento e estorno. Cobrir isolamento por igreja, OWNER, idempotência e concorrência de quotas. Só então cadastrar ambiente de produção, aplicar transição aprovada aos usuários atuais e habilitar vendas. Prever recebimento e renovação sem nenhuma tela aberta.

Estados sugeridos: `LEGACY`, `TRIALING`, `PENDING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED`. Estado e direito de uso não são a mesma coisa: cancelamento impede futuras renovações, mas pode preservar o período já pago; estorno/chargeback exige política própria. Proposta de carência: três dias após vencimento, depois bloquear novos processamentos sem apagar a biblioteca. Não renovar franquias por calendário global nem pelo relógio do navegador; usar competências persistidas e confirmação do pagamento.

## Pronto nesta etapa

- Catálogo tipado, preços em centavos e limites propostos versionados.
- Estimativa de créditos e simulador de resultado com custos explícitos.
- Tela interna de revisão, restrita ao Responsável, com uso atual real da igreja.
- Preparação e diagnóstico das variáveis Asaas sem exposição de segredos.
- Sem cobrança, atribuição de assinatura, bloqueio, alteração do banco ou mudança da landing.
