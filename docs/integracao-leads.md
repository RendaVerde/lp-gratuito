# Correção de envio para a aba de clientes

## Evidência e causa no frontend

As duas LPs usam o mesmo endpoint Apps Script. Na referência `langing-page/script.js`, o formulário de clientes cria um objeto com `tipo: "cliente"`, `lead_id`, `nome`, `whatsapp`, `email`, `cidade`, `interesse`, `perfil` e `observacao`. A função `saveLeadToSheet` serializa esse objeto como JSON em um único parâmetro de formulário chamado `payload`.

A LP gratuita, antes desta correção, enviava campos diretamente no formulário URL-encoded, sem o invólucro `payload`, com `lead_type: "cliente_gratuito"`, `name`, `phone`, `city`, `interest`, `profile` e `observation`. Portanto, não seguia o contrato usado pelo cliente da integração existente. Esse desvio explica a falha observada, independentemente da abertura correta do WhatsApp, que é um caminho separado.

## Correção aplicada somente na LP gratuita

- JSON dentro de `payload`, com `tipo: "cliente"` e campos em português.
- Mesmo `site_id` da integração existente: `rendaverde-igreen`. Não foi possível inspecionar se o Apps Script valida esse identificador; reutilizá-lo elimina uma diferença adicional em relação ao contrato conhecido.
- Origem diferenciada em `landing_id: "cliente-gratuito-igreen"` e `page_url`. Se o backend ignora campos adicionais, `page_url` já faz parte do contrato existente.
- `lead_id` gerado uma vez por tentativa e preservado entre Beacon e fallback.
- Resumo do simulador junto a `observacao`, sem depender de uma coluna nova chamada `simulation`.
- UTMs, gclid e fbclid preservados.
- Fallback POST também quando o Beacon lança uma exceção; timeout de 8 segundos no fallback quando AbortController está disponível.
- Resultado do transporte tratado no formulário. Falha tem evento e mensagem específicos; o WhatsApp continua recebendo os dados. O botão é liberado ao terminar e cliques simultâneos não enviam cadastros duplicados.

## Limites de confirmação

`sendBeacon()` retornar true significa que o navegador aceitou enfileirar o envio. Uma resposta opaca a `fetch` com `no-cors` não revela o resultado do Apps Script. Nenhum desses retornos comprova uma linha gravada.

Os eventos distinguem `lead_cliente_gratuito_envio_tentado`, `lead_cliente_gratuito_enviado` (transporte aceito) e `lead_cliente_gratuito_envio_falhou`. Não se emite `lead_salvo`. O envio ao WhatsApp registra solicitação de abertura, não conversa concluída.

O código do Apps Script e a planilha não estão disponíveis neste projeto. Não foi feita alteração remota nem inserção de dados de teste em produção. Os testes executam o JavaScript real em ambiente isolado, inspecionam o corpo enviado e simulam falhas de rede e o fluxo do formulário.

Para conferir a gravação real após carregar a versão corrigida, enviar um cadastro de teste e procurar o nome na aba Clientes. Se não aparecer, conferir a implantação/execuções do Apps Script e suas permissões de escrita. Para confirmação automática no frontend, o backend precisaria oferecer uma resposta legível de persistência; apenas alterar o modo CORS no navegador não resolve essa limitação.

Execute `node --test tools/test-lead-integration.cjs` para validar o contrato e os caminhos de falha sem transmitir dados externos.
