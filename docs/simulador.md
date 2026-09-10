# Simulador de indicações — Cliente iGreen

Pesquisa e implementação: 10/09/2026. Apenas `lp-gratuito`; a LP de licenciados é referência de leitura. Não há perfil de licenciado nem comissão de rede no simulador.

## Decisão de posicionamento

Seção imediatamente após os indicadores do topo, antes dos cards de benefícios e vídeos. O CTA secundário do hero e a navegação apontam para `#simulador`. O cadastro permanece como ação principal. A seção não exige dados pessoais para mostrar o resultado.

Base: análise já realizada na tarefa “Analisar relatório do Microsoft Cl…” (01a080f7-380a-7223-9810-606d54161f9d), a partir dos relatórios enviados em 08/09/2026. O relatório registra 30 sessões, profundidade média de 18,61%, tempo ativo de 43 segundos e 93,33% de sessões em Facebook/Instagram. Não houve consulta nova ao painel ao vivo. Esses dados são direcionais: a amostra é pequena e pertence a outro público/LP; não provam aumento de conversão nesta página.

A pesquisa da [Nielsen Norman Group sobre rolagem e atenção](https://www.nngroup.com/articles/scrolling-and-attention/) apoia priorizar conteúdo relevante próximo do topo. Por isso, o cálculo é imediato, os controles são adequados ao toque e valor mensal, quantidade e regra de energia ficam diretamente nos respectivos cards; apenas fontes e regras detalhadas ficam em um expansor. A confirmação do efeito depende de medir o uso real.

## Premissas e fontes

### Telecom

- Mensalidade mínima R$ 54,90, informada pelo responsável pela LP nesta solicitação; não apresentada como preço publicamente verificado.
- O [regulamento oficial](https://www.igreenenergy.com.br/cashback-telecom) diz que o cashback é **fixo de R$ 3,50**, igual para qualquer plano, a cada pagamento do indicado.
- Fórmula: indicações pagas × 350 centavos. Não usar 10% de R$ 54,90.
- O cashback é usado na própria fatura de Telecom; excedente fica para faturas futuras. O indicador precisa manter serviço ativo.
- 10 indicações = R$ 35,00; plano R$ 54,90 deixa R$ 19,90. 15 indicações = R$ 52,50; 16 = R$ 56,00, cobrindo o plano com R$ 1,10 de crédito. O cálculo não aplica saldos de Energia/Seguros em Telecom.

### Energia

- O conteúdo indexado do [regulamento iGreen](https://www.igreenenergy.com.br/cashback-sustentavel) informa cashback do cliente de 2% (A), 1% (B) e 0,5% (C/rural). A abertura direta dessa URL também retornou a página institucional, portanto é necessário conferir a regra efetiva da distribuidora no atendimento.
- O simulador permite faixa A/B de 1%–2%, A, B e C. Não confundir esses percentuais de indicação com desconto na energia do próprio cliente.
- Base inicial R$ 200: exemplo editável da parcela elegível mensal, não uma média nacional da conta inteira e não uma cotação.
- A [EPE, boletim de setembro de 2025](https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-483/topico-769/Boletim%20Trimestral%20de%20Consumo%20de%20Eletricidade%20ANO%20VI%20-%20N%C2%BA22_r.pdf), informa 178,2 kWh/mês por consumidor residencial em junho de 2025; isso é consumo, não preço de conta. O [Anuário 2026](https://dashboard.epe.gov.br/apps/anuario/) reúne dados de 2025.
- A [ANEEL](https://www.gov.br/aneel/pt-br/assuntos/tarifas/ranking-das-tarifas) esclarece que o ranking não inclui tributos, iluminação pública e bandeiras. Não se converteu consumo médio em uma suposta média confiável de boleto elegível iGreen. R$ 500 da captura permanece um cenário possível, não uma média validada.

### Seguros

- A [página comercial da BP](https://comercial.bpseguradora.com.br/bp-seguro-auto-v1/) anuncia a partir de R$ 103,47/mês. É preço de entrada, não média da carteira, e não demonstra a base comissionável.
- Não foi encontrada uma média pública confiável dos prêmios mensais da BP. Assim, R$ 300 da captura não foi apresentado como média validada; o simulador começa com exemplo de R$ 200 e aceita a base elegível da cotação real.
- Os 2,5% vêm da imagem fornecida pelo usuário. Não foi localizado regulamento oficial público que valide essa taxa nesta pesquisa. Por isso, taxa, parcela e soma estão explicitamente identificadas como hipótese de Seguros a confirmar. Não usar sites de licenciados como confirmação oficial.
- Antes de remover essa identificação, confirmar taxa, base e condições vigentes com o responsável comercial. Nenhum bônus pontual ou promoção foi somado à recorrência.

## Cálculo e manutenção

`simulator.js` concentra configurações, função pura `calculate` e interface. Valores são convertidos para centavos; calcula-se e arredonda-se cada indicação antes de multiplicar pela quantidade. Isso é uma convenção ilustrativa, não a reprodução de um demonstrativo de pagamento iGreen.

Entradas: clientes inteiros entre 0 e 1.000 por conexão; bases entre R$ 0 e R$ 100.000, com até duas casas; Telecom mínimo R$ 54,90. Campos inválidos suspendem resultado e CTA; não reutilizam uma estimativa antiga. Limites superiores são guardas de interface, não limites comerciais de indicação.

O resultado é uma soma ilustrativa de benefícios sujeitos a regras distintas, não saldo único para saque. Com 10 clientes em cada conexão e bases R$ 200/R$ 200: Energia R$ 20–40, Telecom R$ 35 e hipótese de Seguros R$ 50; soma R$ 105–125/mês. Com as bases da captura (R$ 500/R$ 300), a soma continua R$ 160–210, pois mudar o plano Telecom não altera seu cashback fixo.

O botão de atendimento abre o formulário existente; o resumo só é anexado à mensagem do WhatsApp e à propriedade `observacao` do payload quando o visitante envia esse formulário. Não há transmissão da simulação ao digitar. O envio usa `tipo: "cliente"` e o mesmo contrato da LP Renda Verde. Não houve alteração do Apps Script remoto nem confirmação visual de linha gravada na planilha.

## Medição e verificação

- Filtro Clarity: `landing_version = cliente_gratuito_v2_simulador`.
- Eventos: `simulador_cliente_visualizado`, `simulador_cliente_iniciado`, `simulador_cliente_calculado`, `simulador_cliente_premissas_alteradas`, `simulador_cliente_atendimento`, `simulador_cliente_lead_enviado`.
- Visualização dispara uma vez ao ver pelo menos 25% dos controles; início na primeira interação; cálculo tem debounce de 800 ms. Alteração de valor ou regra dispara `premissas_alteradas` ao confirmar o campo (change). Não envia campos pessoais nos eventos do simulador.
- `lead_enviado` registra transmissão aceita pelo navegador, não confirmação de gravação na planilha nem conversa iniciada no WhatsApp. O backend usa `sendBeacon`/`no-cors`, sem confirmação de persistência.
- Execução: `node tools/validate-page.js`, `node --check simulator.js`, `node --test tools/test-simulator.js`.
- Testes cobrem exemplo da captura, novo plano, 15/16 indicações, zero, A/B/C, arredondamento, limites, entradas inválidas e independência entre benefícios.

Não houve publicação, envio de cadastro real ou alteração do painel Clarity. A autorização de pesquisa termina com a resposta desta solicitação.
