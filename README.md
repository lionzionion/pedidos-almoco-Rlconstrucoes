# AMBEV | PEDIDOS RL

### Gestão digital de café da manhã e almoço na obra

Aplicativo web de gestão de refeições da **RL Engenharia na obra AMBEV Itapissuma/PE**. Organiza solicitações dos colaboradores, produção do restaurante, cancelamentos, relatórios e conferência diária antes do pagamento.

## 🌐 Abra o projeto

| Ambiente | Link | Finalidade |
|---|---|---|
| **Site de apresentação do produto** | [Abrir apresentação](https://lionzionion.github.io/pedidos-almoco-solutio/produto/) | Explicar a solução a gestores e parceiros |
| **Aplicativo conectado ao banco** | [Abrir acesso](https://lionzionion.github.io/pedidos-almoco-solutio/app/) | Login e pedidos reais **após homologação** |
| **Demonstração interativa** | [Testar sistema](https://lionzionion.github.io/pedidos-almoco-solutio/demo/) | Pedidos **fictícios**, sem usar o banco real |
| **Versão anterior** | [Abrir formulário legado](https://lionzionion.github.io/pedidos-almoco-solutio/) | Mantida temporariamente na raiz |

> **SITUAÇÃO EM 15/11/2026:** o primeiro acesso ADM foi ativado no Supabase para a conta confirmada de Leandro Dias. A área **Cadastros** já permite criar usuários do restaurante e colaboradores com login e senha. Ainda faltam testes completos com contas separadas e impressões reais antes de usar em cobranças. Para apresentar a solução, utilize `/demo/`.

## O que já foi implementado

- Formulário responsivo do colaborador com café da manhã e almoço.
- Rodízio semanal conforme o cardápio do restaurante.
- Café completo R$ 17, pão simples R$ 10 e almoço R$ 22.
- Acompanhamentos de almoço e campo de observações.
- Painel de preparo do restaurante e atualização Realtime.
- Perfis de acesso colaborador, restaurante e administrador (ADM existente liberado no banco).
- **Cadastro centralizado pelo ADM**, com usuário simples e senha temporária; criação e redefinição protegidas por função Supabase, sem e-mail pessoal dos colaboradores.
- Desativação, reativação e alteração de perfil com auditoria administrativa.
- Edição e cancelamento antes do preparo.
- Arquivamento/restauração administrativos (exclusão lógica e auditada).
- Relação nominal e fechamento financeiro por data/refeição.
- **Relatórios diários PDF A4** com logomarca RL, nomes, itens, cancelamentos, subtotal, taxas e total; opção de **Imprimir / Salvar como PDF**.
- Mapa de produção do restaurante em PDF (pedidos, acompanhamentos, observações e status).
- Exportação CSV e resumo consolidado para envio manual por WhatsApp.
- Banco Supabase separado, autenticado, com PostgreSQL e políticas RLS.
- Demonstração com dados fictícios para reuniões e apresentação no canteiro.

## Comece pela documentação

1. [Visão geral e problema resolvido](docs/01-VISAO-GERAL.md)
2. [Manual completo de uso para colaborador, restaurante e gestão](docs/02-GUIA-USO.md)
3. [Arquitetura, segurança e modelo de dados](docs/03-ARQUITETURA-E-SEGURANCA.md)
4. [Implantação, acessos e roteiro de apresentação comercial](docs/04-IMPLANTACAO-E-APRESENTACAO.md)

## Estrutura do repositório

```text
├── assets/          # logomarca oficial RL em WebP e cópia SVG
├── app/             # aplicação conectada a Supabase
├── demo/            # demonstração local e fictícia
├── produto/         # vitrine comercial do software
├── supabase/        # schema, migrações e Edge Function segura manage-users
├── docs/            # guias funcionais, técnicos e implantação
├── tests/           # testes de cardápio, logo, relatórios e financeiro
├── index.html       # formulário anterior preservado
└── README.md
```

## Execução em desenvolvimento

O sistema web **não exige npm nem build** para funcionar. Abra `app/index.html` ou execute servidor estático (por exemplo, `python -m http.server 8000`) na pasta do repositório e visite `http://localhost:8000/app/`. Para testes Node.js do cardápio:

```powershell
node --test tests/*.test.cjs
```

A configuração do projeto Supabase dedicado está em `app/config.js`. Contém **somente URL e chave publicável** do Supabase (não é segredo). Nunca coloque `service_role` ou `sb_secret` no frontend.

## Arquitetura resumida

```text
Colaborador ─┐
Restaurante ─┼──> GitHub Pages (/app) ──> Supabase Auth + API ──> PostgreSQL (RLS)
Gestão RL  ──┘                               │
                                            └──> Realtime + auditoria
Gestão RL ──> PDF, impressão, CSV / resumo WhatsApp (envio manual)
Gestão RL ──> Edge Function manage-users ──> Supabase Auth Admin (servidor)
```

## Regras importantes

- O servidor valida as opções do rodízio, data e preço, e impede múltiplos pedidos ativos da **mesma refeição** pelo mesmo usuário no mesmo dia.
- A taxa de entrega padrão é **uma por remessa/refeição**: café R$ 12; almoço segunda a sexta R$ 8; sábado e domingo R$ 12.
- Pedidos cancelados ou arquivados não integram o total ativo; a gestão deve reconciliar os pedidos efetivamente preparados/entregues.
- Não há exclusão física pela interface; o histórico de cancelamentos/arquivamentos é preservado.
- WhatsApp abre um texto consolidado para confirmação manual pelo usuário.
- A versão `/demo/` **não** escreve pedidos no banco de dados.

## Como entrar e cadastrar colaboradores

1. O **ADM inicial** faz login em [AMBEV Pedidos RL](https://lionzionion.github.io/pedidos-almoco-solutio/app/) com seu e-mail já confirmado e senha existente; sua permissão `admin` está ativa.
2. Acesse a aba **Cadastros** e cadastre o nome completo, o usuário (ex.: `joao.campos`), uma **senha temporária de pelo menos 8 caracteres** e o perfil `colaborador` ou `restaurante`.
3. Entregue o usuário e a senha por canal privado; o colaborador entra pelo **usuário + senha**, de qualquer aparelho, sem fornecer e-mail pessoal.
4. A proprietária do restaurante entra pelo mesmo link e verá automaticamente a aba **Restaurante**.
5. O ADM pode desativar, reativar, alterar entre os perfis de colaborador/restaurante e redefinir senhas. O primeiro administrador não pode ser desativado pela interface.
6. A senha nunca é recuperada em texto puro. Quando esquecida, deve ser **redefinida** pela gestão. Alterações ficam no histórico `account_audit`.

**Servidor de gestão:** `supabase/functions/manage-users/index.ts` — autentica o token, confere papel e estado ativo do administrador e usa credenciais privilegiadas **somente no servidor**. O frontend possui apenas chave publicável.

## Relatórios

- **ADM:** Conferência RL → selecione o dia e a refeição → **Baixar PDF** ou **Imprimir relatório**. O documento contém a lista nominal, situação dos pedidos, valores e taxas do dia. Pedidos cancelados ou arquivados são identificados e excluídos da soma.
- **Restaurante:** painel Restaurante → escolha o dia e a refeição → **Baixar PDF da produção** ou **Imprimir lista**, com acompanhantes e observações.
- A opção Imprimir permite escolher **Salvar como PDF** no navegador.
- Os PDFs são gerados no próprio navegador; o arquivo não é publicado automaticamente na internet. Os dados vêm do Supabase, protegidos pelas políticas de acesso.

## Pendências antes de usar em cobrança real

1. Criar no painel ADM um usuário **restaurante** e um usuário **colaborador de teste** com senhas individuais (não existem contas fictícias no banco).
2. Entrar simultaneamente em dois celulares distintos, validar status em tempo real, edição, cancelamento e saída.
3. Verificar download e impressão PDF em Android, iOS e computador; conferir valores e nomes.
4. Definir horários de corte e regra financeira de pedidos em preparo cancelados e de remessas extras.
5. Recomendado: habilitar proteção contra senhas vazadas em Supabase Auth → segurança de senhas.

---

**RL Engenharia — Fazendo Acontecer.** Projeto demonstrativo e sistema interno de gestão de refeições • 2026.

## Identidade visual oficial

A logomarca oficial **RL Engenharia — Fazendo Acontecer**, enviada pelo proprietário, foi incorporada ao repositório em `assets/rl-logo.webp` (imagem com fundo transparente). O arquivo é usado no cabeçalho de **todas as telas do app**, login, demonstração, site de apresentação e formulário anterior. O favicon também usa a marca.

Para validar todas as referências da imagem antes de publicar, execute `node --test tests/logo.test.cjs`.
