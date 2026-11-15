# AMBEV | Pedidos RL Engenharia

Sistema de refeições exclusivo da **RL Engenharia — obra AMBEV Itapissuma/PE**.

> **Estado desta ramificação (15/11/2026):** projeto Supabase dedicado à RL criado em São Paulo, esquema aplicado e atualizações Realtime habilitadas. A configuração pública de conexão já está em `config.js`. **O site público (ramo `main`) continua antigo; esta versão só estará acessível à equipe após publicação e testes de login.**

## Funcionalidades

- Cardápio de **café da manhã e almoço por dia da semana** (inclusive sábado e domingo).
- Café do rodízio: **R$ 17,00**; café simples com pão: **R$ 10,00**; almoço: **R$ 22,00**.
- Taxa coletiva de entrega **por remessa**: café R$ 12; almoço de segunda a sexta R$ 8; fins de semana R$ 12.
- Colaborador: login, cadastro, pedido confirmado, histórico, edição e cancelamento **antes do preparo**.
- Restaurante: painel por dia/refeição; atualização do status de confirmado → em preparo → entregue; pedidos cancelados continuam identificados.
- Gestão RL: relação nominal, total das refeições, taxas, cancelamentos, arquivamento (remoção lógica), restauração, CSV e resumo do WhatsApp.
- Segurança: políticas de acesso **RLS no Supabase**, validação de cardápio/preço no banco, rastreio de alterações em `order_audit`.
- Nomes e demais dados de usuários não ficam disponíveis publicamente no GitHub Pages. Só usuários autenticados e autorizados acessam registros, após configurar RLS.

## Configuração para funcionar com vários celulares

1. ✅ **Já executado:** projeto Supabase exclusivo `AMBEV Pedidos RL` (`dpmofhdaefcqxohuhkfr`), São Paulo, criado na organização existente.
2. ✅ **Já executado:** `supabase/schema.sql` e `supabase/realtime.sql` aplicados (RLS, histórico e pedidos em tempo real).
3. ✅ **Já executado:** `config.js` aponta para o projeto, usando **somente chave publishable**, que pode constar no site público com RLS. **NUNCA publique service_role ou secret key.**
4. **A fazer:** em **Authentication > URL Configuration**, configure o URL do site publicado. Configure confirmação de e-mail conforme a rotina da equipe.
5. Crie seu usuário pela tela inicial e confirme o e-mail. Promova seu usuário para gestor no SQL Editor (substitua pelo seu e-mail real):
   ```sql
   update public.profiles set role='admin'
   where id=(select id from auth.users where email='EMAIL_DO_GESTOR');
   ```
6. A proprietária do restaurante cria o cadastro, confirma o e-mail e é promovida para restaurante:
   ```sql
   update public.profiles set role='restaurante'
   where id=(select id from auth.users where email='EMAIL_DO_RESTAURANTE');
   ```
7. ✅ **Já executado:** `orders` habilitado na publicação `supabase_realtime` (a interface também faz atualizações periódicas e dispõe de botão Atualizar).
8. Teste em **dois dispositivos distintos**, com um colaborador e o restaurante autenticados em contas diferentes, incluindo confirmação, edição, cancelamento, preparo e conferência de totais.
9. Somente depois de validar os fluxos reais, faça merge desta ramificação para `main` e publique com GitHub Pages.

### WhatsApp

No painel **Conferência RL**, informe `55 + DDD + número`, inicialmente o número do responsável RL. O aplicativo monta **um resumo consolidado**, abre a conversa e exige a confirmação do envio no WhatsApp. O destinatário fica salvo **somente no navegador do gestor**. **Não existe envio automático pelo WhatsApp API** nesta versão; a proprietária deve consultar os pedidos no próprio app.

### Política de cancelamento e exclusão

- Colaborador: pode editar ou cancelar **enquanto confirmado**, desde que não tenha entrado em preparo.
- Restaurante: pode atualizar status para **em preparo** e **entregue**; não pode alterar preços ou apagar.
- Gestor RL: pode cancelar com justificativa, arquivar e restaurar. Arquivar não é exclusão física, preserva a auditoria e remove o valor do total ativo.
- Pedidos cancelados/arquivados **não entram no total do dia**. A conferência final deve reconciliar o que foi efetivamente preparado e entregue; eventuais cobranças excepcionais devem ser tratadas pela administração.
- Limite de um pedido ativo de **cada refeição por colaborador por dia**.

## Estrutura

- `index.html` — páginas de pedidos, restaurante e conferência
- `styles.css` — visual responsivo nas cores azul e verde da RL
- `menu.js` — rodízio, preços, datas e resumo financeiro
- `app.js` — autenticação, criação, edição, cancelamento, status, CSV e WhatsApp
- `config.js` — configuração pública do backend (sem segredos)
- `supabase/schema.sql` — estrutura e políticas de proteção de dados

## Cuidados de implantação

O fechamento calcula **uma taxa de entrega por refeição/dia**, caso exista pelo menos um pedido ativo. Se o restaurante realizar **mais de uma remessa no mesmo período**, o controle de remessas deverá ser ampliado para registrar taxas adicionais. O cardápio está fixo conforme a tabela enviada em 15/11/2026; a edição de cardápio pelo restaurante é uma evolução posterior. Para exclusão de dados pessoais definitiva, deve existir um procedimento administrativo específico, separado do cancelamento financeiro.

A publicação pode ser estática via **GitHub Pages** e não exige build/npm. O banco Supabase já está provisionado; faltam cadastrar o gestor/restaurante e testar no site publicado.

**Painel Supabase:** https://supabase.com/dashboard/project/dpmofhdaefcqxohuhkfr
