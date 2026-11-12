# Pedidos de Almoço — Solutio / RL

Formulário de pedido de almoço hospedável gratuitamente no **GitHub Pages**.

## Funcionalidades
- Campo de identificação por funcionário e empresa.
- Até 2 escolhas do cardápio.
- Resumo do pedido e envio pelo WhatsApp.
- Botão para copiar a mensagem.
- Data do pedido atualizada automaticamente no horário de Recife.

## Publicação
1. Abra **Settings → Pages** neste repositório.
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. Configure **main** e **/(root)**, então clique em **Save**.
4. Acesse: https://lionzionion.github.io/pedidos-almoco-solutio/

Se a página mostrar 404, confirme o estado da publicação em **Actions** ou em **Settings → Pages**.

## Observações importantes
- Versão recuperada de arquivo HTML de **28/10/2026** e adaptada para hospedagem estática. Pode não incluir alterações posteriores da Vercel.
- **Não existe banco de dados** neste HTML: o envio só é concluído após confirmação no WhatsApp.
- Para preencher automaticamente o número do destinatário, adicione `?dest=55DDDNÚMERO` ao URL do site (apenas dígitos).
- Para mudar as opções do cardápio, edite o array `meats` no `index.html`.
- Antes de divulgar aos funcionários, teste o envio do pedido.
