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
2. Digite o nome, usuário (3–30 caracteres, iniciando com letra minúscula), senha inicial com **8–72 caracteres** e perfil.
3. Escolha **Colaborador** ou **Restaurante**, depois **Cadastrar na nuvem**.
4. Compartilhe login e senha pelo canal privado combinado com o colaborador/restaurante.
5. Em **Usuários cadastrados** é possível **Desativar**, **Reativar**, alterar perfil entre colaborador/restaurante e **Redefinir senha**.
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

O cálculo padrão considera um frete coletivo por refeição: **R$12 no café**; almoço **R$8 seg–sex / R$12 sáb–dom**. Cancelados e arquivados não são somados. Os totais são de **conferência**, não comprovante de pagamento. Remessas adicionais e cobrança de pedidos já preparados exigem registro e acerto separados.

## Testes sem risco de pedidos reais

Acesse https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/demo/

A demonstração é **separada do banco** e contém somente nomes e pedidos fictícios. Use-a para apresentações.
