# Guia de uso — AMBEV | Pedidos RL

## Entrar no aplicativo

Endereço: https://lionzionion.github.io/pedidos-almoco-solutio/app/

A tela inicial possui campos **E-mail**, **Senha** e, para o primeiro cadastro, **Nome completo**. Clique em **Criar cadastro** apenas uma vez e confirme o e-mail se solicitado. Nas próximas entradas use **Entrar**.

> O primeiro usuário tem perfil padrão **colaborador**. Um gestor precisa ser promovido para `admin` no Supabase antes de acessar o fechamento. O restaurante precisa de permissão `restaurante`. Não é seguro conceder essas permissões apenas por um botão visível na interface.

## Colaborador

1. Abra **Fazer pedido**.
2. Selecione **Café da manhã** ou **Almoço**. O sistema apresenta apenas as opções do dia (horário de Recife).
3. Clique no prato desejado. No almoço, marque os acompanhamentos: **arroz, feijão mulato ou macassar, macarrão, vinagrete e legumes**.
4. Preencha observações caso necessário e clique em **Confirmar pedido**.
5. Em **Meus pedidos**, acompanhe o status.
6. É possível **Editar** ou **Cancelar pedido** enquanto o status for **Confirmado**. Após **Em preparo**, a edição/cancelamento pelo colaborador é bloqueada.

## Restaurante

1. Entre com o cadastro autorizado como `restaurante`.
2. Abra **Restaurante**; filtre por data e por **Café** / **Almoço**.
3. Consulte o nome do colaborador, prato, acompanhamentos e observações.
4. Clique em **Iniciar preparo** quando começar a cozinhar.
5. Clique em **Marcar entregue** após a entrega.

Pedidos cancelados continuam sinalizados, mas não integram o total de pedidos ativos. Os painéis recebem eventos de atualização pelo Supabase e também podem ser atualizados manualmente.

## Gestor RL

1. Entre com perfil `admin`.
2. Abra **Conferência RL** e selecione data e refeição.
3. Confira a lista nominal, quantidades, estados e valores.
4. Use **Cancelar** para cancelamento administrativo com motivo.
5. Use **Arquivar** para retirar um pedido ativo da apuração, preservando histórico; **Restaurar** para reexibi-lo.
6. Clique em **Exportar CSV** para baixar a conferência.
7. Informe o número de WhatsApp com **55 + DDD + número** e clique em **Resumo para WhatsApp**; confirme o envio na conversa aberta.

### Regras de apuração

A apuração padrão considera pedidos ativos, inclusive os em preparo ou entregues; exclui cancelados e arquivados e adiciona **uma entrega por refeição presente no dia**. Confira a entrega efetiva antes do pagamento e trate remessas extras ou exceções fora do modelo padrão.

## Demonstração para reunião ou apresentação

Abra https://lionzionion.github.io/pedidos-almoco-solutio/demo/

A demonstração possui **pedidos e nomes fictícios**. Selecione **Testar colaborador**, **Testar restaurante** ou **Testar gestão RL**. Tudo acontece somente no navegador do visitante, sem salvar nada no banco real.
