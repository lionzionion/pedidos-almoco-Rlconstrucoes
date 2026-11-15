# Guia de uso — AMBEV | Pedidos RL

## Acesso ao aplicativo

https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/app/

A página de login pede **Usuário ou e-mail do administrador** e **Senha**.

- **Administrador inicial:** entra pelo seu e-mail confirmado e senha pessoal já cadastrada.
- **Colaborador:** usa login simplificado, por exemplo `joao.campos`, mais uma senha que o gestor definir.
- **Restaurante:** usa login e senha próprios criados pelo ADM. O aplicativo identifica o papel automaticamente.
- Não há cadastro público de funcionários no aplicativo: somente o ADM pode criar contas ativas.

As senhas são tratadas pelo Supabase Auth e não ficam armazenadas em texto puro no aplicativo.

## Área de administração de usuários

1. Faça login como ADM e abra **👥 Cadastros**.
2. Digite o nome, usuário (3–30 caracteres, iniciando com letra minúscula) e perfil. Deixe a senha vazia para gerar uma **senha forte automática**, ou digite uma senha inicial de **8–72 caracteres**. Você também pode clicar em **Gerar senha forte**.
3. Escolha **Colaborador** ou **Restaurante**, depois **Cadastrar na nuvem**.
4. Após criar, copie o login e a senha apresentados **uma única vez** e compartilhe por canal privado. Se precisar posteriormente, use **Redefinir senha** para gerar outra; não é possível consultar a senha antiga.
5. Em **Usuários cadastrados** é possível **Desativar**, **Reativar**, alterar perfil entre colaborador/restaurante, **Redefinir senha** (automática ou manual) e **Excluir usuário sem pedidos**. Cada usuário pode alterar sua própria senha na aba **Minha senha**.
6. Nunca compartilhe sua própria senha ADM, nem reutilize a mesma senha de colaboradores. O primeiro ADM não pode ser desativado por esse painel.

## Colaborador: fazer pedido

1. Entre com usuário e senha.
2. Abra **Fazer pedido**, escolha **Café da manhã** ou **Almoço**.
3. Selecione prato do cardápio referente ao dia atual no horário de Recife. No almoço, personalize acompanhamentos e observações.
4. Clique em **Confirmar pedido**.
5. Em **Meus pedidos**, consulte o status e edite ou cancele enquanto o pedido estiver **Confirmado**.

## Restaurante: acompanhar e imprimir pedidos

1. Entre com a conta de perfil **Restaurante** criada pelo ADM.
2. O painel Restaurante aparece automaticamente. Filtre pelo dia e tipo de refeição.
3. Consulte nome, prato, acompanhamentos e observações dos funcionários.
4. Clique em **Iniciar preparo** e depois **Marcar entregue**.
5. Para preparar uma lista física, clique em **Baixar PDF da produção** ou **Imprimir lista**.

## Gestão RL: conferência e relatórios

1. Entre com a conta ADM e abra **📊 Conferência RL**.
2. Selecione **Dia** e **Refeição** (todas, café ou almoço).
3. Confira nominalmente pedidos, valores, status e cancelamentos.
4. **Baixar PDF:** cria documento A4 com logo RL, relação nominal, subtotal, taxas de entrega e total.
5. **Imprimir relatório:** abre uma página de impressão; selecione impressora ou **Salvar como PDF**.
6. **Exportar CSV:** para conferência em planilha.
7. **Resumo para WhatsApp:** abre mensagem consolidada para envio manual.
8. **Cancelar** e **Arquivar** preservam trilha de alterações; arquivados podem ser restaurados.

### Apuração

O cálculo considera **R$ 8 por remessa**, apenas uma vez para todos os pedidos ativos do café **após 08h**, e outra taxa de R$ 8 para todos os almoços ativos **após 13h** (horário de Recife), inclusive fins de semana. Os funcionários não pagam frete individual em cada pedido. Cancelados e arquivados não são somados. Os totais são de conferência, não comprovante de pagamento; remessas extraordinárias exigem acerto separado.

## Testes sem risco de pedidos reais

Acesse https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/demo/

A demonstração é **separada do banco** e contém somente nomes e pedidos fictícios. Use-a para apresentações.

### Chat privado com restaurante e gestão

Abra **Chat do restaurante**. O colaborador visualiza sua conversa exclusiva. Restaurante e ADM escolhem um colaborador ou a conversa reservada RL ↔ Restaurante. Envie mensagens e acompanhe as respostas no próprio aplicativo.

### Limpeza da fase de testes

Na aba **Cadastros** (apenas ADM), use **Verificar dados** para consultar quantos pedidos, registros do histórico de pedidos e mensagens existem. Depois, se decidir limpar, clique em **Apagar pedidos e conversas de teste**, confirme duas vezes e digite **ZERAR TESTES**. Essa operação é irreversível. As contas, registros administrativos de auditoria e logs técnicos do Supabase permanecem. Não execute durante a operação real da obra.
