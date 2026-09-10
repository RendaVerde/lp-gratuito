# Landing Page Cliente Gratuito iGreen

Landing page estática voltada à apresentação da modalidade Cliente Green Start,
explicação dos benefícios e captação de interessados pelo WhatsApp. Este projeto
é independente da landing page Renda Verde e não altera o fluxo de licenciados.

## Estrutura do projeto

- `index.html`: conteúdo, ordem da jornada, formulário e integrações carregadas
  pela página.
- `style.css`: identidade visual, componentes, animações, responsividade e regra
  global de legibilidade.
- `script.js`: modal, máscara de telefone, analytics, montagem da mensagem de
  WhatsApp e persistência dos leads.
- `img/`: logo, favicon, imagem de abertura e ícones vetoriais das conexões.
- `tools/validate-page.js`: validação automatizada da estrutura e das integrações.

Os três arquivos principais possuem um índice no início e blocos numerados. No
HTML e no CSS, a ordem desses blocos acompanha a jornada visual da página.

## Jornada da página

1. Apresentação do cadastro gratuito.
2. Indicadores institucionais.
3. Soluções e benefícios.
4. Vídeos explicativos do canal oficial da iGreen.
5. Cashback por indicação.
6. Funcionamento em três passos.
7. Diferenciais da modalidade gratuita.
8. Perguntas frequentes e chamada final.
9. Formulário com continuidade pelo WhatsApp.

## Pontos de integração

As configurações externas ficam concentradas no objeto `CONFIG`, no início de
`script.js`:

- `whatsappNumber`: número que recebe os contatos;
- `sheetEndpoint`: endpoint usado no envio para o Google Sheets;
- `sheetSiteId`: identificador exclusivo desta LP na planilha.

Google Analytics e Microsoft Clarity são carregados no `<head>` de `index.html`.
Os vídeos são incorporados pelo domínio de privacidade aprimorada do YouTube e
carregados somente quando se aproximam da área visível.
O formulário utiliza `data-clarity-mask="true"` para proteger os dados do lead.
As UTMs presentes na URL são enviadas junto com o cadastro.

## Convenções de manutenção

1. Preserve a ordem numerada das seções no HTML, CSS e JavaScript.
2. Mantenha o objeto `CONFIG` no início de `script.js`.
3. Ao alterar um `id`, atualize também as referências no JavaScript e os
   atributos `for` dos campos relacionados.
4. Mantenha o bloco global de legibilidade no final de `style.css`; a posição
   garante prioridade na cascata.
5. Não reduza textos informativos para menos de `15px` e mantenha campos em
   `16px` para evitar zoom automático no celular.
6. Preserve pares de duração e atraso entre cada argola e seu rótulo para manter
   os textos separados e na orientação correta.
7. Confirme número de WhatsApp, endpoint e condições comerciais antes de
   publicar.

## Validação

Execute:

```powershell
node tools/validate-page.js
```

O validador verifica:

- sintaxe do JavaScript, inclusive scripts embutidos no HTML;
- balanceamento dos blocos CSS e estrutura básica do HTML;
- IDs duplicados e associações entre labels, campos e JavaScript;
- existência de todos os arquivos locais referenciados;
- carregamento do Microsoft Clarity e proteção do formulário;
- identificador exclusivo desta LP no envio para a planilha.

Além da validação automática, revise desktop e mobile depois de alterar layout,
formulário, navegação, animações ou regras de responsividade.
