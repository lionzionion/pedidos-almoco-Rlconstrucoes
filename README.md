<div align="center">

<img src="assets/rl-logo.webp" alt="RL Engenharia — Fazendo Acontecer" width="370">

# RL Pedidos | Gestão de Refeições em Obras

**Uma solução digital da RL Engenharia para organizar café da manhã, almoço, restaurante e conferência financeira em canteiros de obras.**

**Projeto-piloto: obra AMBEV, Itapissuma — Pernambuco.**

[**Conhecer a solução**](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/) · [**Acessar o aplicativo**](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/acesso/) · [**Testar demonstração**](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/demo/)

![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-F7DF1E?logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Web-222222?logo=githubpages&logoColor=white)
![Status](https://img.shields.io/badge/Status-Homologa%C3%A7%C3%A3o-006D9B)

</div>

---

## O problema

Em uma obra, os pedidos de refeições frequentemente são feitos em conversas individuais e grupos de mensagens. Quando chega a hora de pagar o restaurante, a gestão precisa conferir manualmente **quem pediu, o que pediu, quanto foi entregue e quanto deve ser cobrado**.

Isso pode gerar duplicidade, cancelamentos sem registro, dificuldade de planejar a produção e divergências na conferência.

## A solução

O **RL Pedidos** centraliza toda a operação em um aplicativo web responsivo, acessível por celular ou computador, com três perfis e dados compartilhados em um banco na nuvem.

| Perfil | O que faz |
|---|---|
| 👷 **Colaborador** | Entra com usuário e senha, escolhe café ou almoço no cardápio do dia, personaliza acompanhamentos, confirma, consulta e cancela pedidos enquanto permitido. |
| 🍽️ **Restaurante** | Visualiza pedidos recebidos, nomes, acompanhamentos e observações; atualiza o estado para **em preparo** e **entregue**; imprime o mapa de produção. |
| 📊 **Administração RL** | Cadastra e gerencia usuários, acompanha todos os pedidos, identifica cancelamentos, confere preços e taxas, emite relatórios PDF e exporta dados. |

### Fluxo operacional

```mermaid
flowchart LR
    A["Colaborador escolhe refeição"] --> B["Pedido registrado na nuvem"]
    B --> C["Restaurante visualiza e prepara"]
    C --> D["Entrega e atualização de status"]
    D --> E["Gestão confere nomes e valores"]
    E --> F["Relatório PDF / CSV"]
```

## Acesse o projeto

| Destino | Endereço | Indicação |
|---|---|---|
| **Portal do produto** | [rl-pedidos · apresentação](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/) | Apresentações, portfólio e demonstração da solução |
| **Acesso único** | [Entrar no RL Pedidos](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/acesso/) | Colaboradores, restaurante e administração |
| **Demo interativa** | [Explorar versão fictícia](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/demo/) | Testes e apresentações sem alterar o banco real |
| **Aplicação original** | [Rota técnica do aplicativo](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/app/) | Mesmo sistema autenticado |
| **Formulário histórico** | [Versão anterior preservada](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/legado/) | Compatibilidade e registro da evolução do projeto |

**Importante:** o aplicativo utiliza autenticação e está em **fase de homologação operacional**. A demonstração é isolada, utiliza dados fictícios e não envia pedidos ao restaurante.

## Principais funcionalidades

- **Cardápio por dia da semana:** rodízio de café da manhã e almoço, de segunda a domingo.
- **Personalização de refeições:** escolha do prato, acompanhamentos, observações e restrição de dois feijões simultâneos.
- **Controle de pedidos:** confirmação, edição e cancelamento antes do preparo; arquivamento administrativo com histórico.
- **Gestão de acessos:** criação de contas com nomes de usuário, permissões distintas, redefinição de senha e desativação de acesso.
- **Painel do restaurante:** lista de produção, status de preparo/entrega e visualização de cancelamentos.
- **Conferência financeira:** total das refeições e taxa coletiva de entrega conforme o dia, com lista nominal.
- **Relatórios:** PDF A4 com logo RL, impressão, CSV e resumo consolidado para envio manual por WhatsApp.
- **Dados centralizados:** PostgreSQL na nuvem, autenticação Supabase, políticas de acesso por linha (RLS), auditoria e atualização em tempo real.

### Regras de preço do projeto-piloto

| Item | Valor |
|---|---:|
| Café completo | R$ 17,00 |
| Café simples com pão | R$ 10,00 |
| Almoço | R$ 22,00 |
| Entrega de café por remessa padrão | R$ 12,00 |
| Entrega de almoço, segunda a sexta | R$ 8,00 |
| Entrega de almoço, sábado e domingo | R$ 12,00 |

*Valores e cardápios específicos da operação de referência, informados em novembro de 2026. A taxa é contabilizada uma vez por refeição/período no fechamento padrão. Remessas extras exigem tratamento específico.*

## Arquitetura e tecnologias

```text
GitHub Pages
  ├── Portal comercial             / e /produto/
  ├── Acesso único                 /acesso/
  ├── Interface autenticada        /app/
  └── Demonstração local           /demo/
            |
            v
       Supabase Auth
            |
            v
Supabase PostgreSQL + Row Level Security
  ├── profiles        usuários e permissões
  ├── orders          refeições, status e valores
  ├── order_audit     histórico de alterações
  └── account_audit   ações administrativas
            |
            +── Realtime: atualizações de pedidos
            +── Edge Function: manage-users (criação e gestão de contas)
            +── Browser: PDF / impressão / CSV
```

**Stack:** HTML5, CSS3, JavaScript, Supabase Auth, PostgreSQL, Row Level Security (RLS), Supabase Realtime, Supabase Edge Functions, jsPDF, jsPDF-AutoTable e GitHub Pages.

### Segurança e dados

- Os funcionários não precisam informar e-mail pessoal: a administração cria **login e senha individuais** usando um identificador interno no serviço de autenticação.
- Somente o perfil **ADM ativo** pode conceder contas de colaborador/restaurante. Senhas e credenciais privilegiadas **não são expostas no código do navegador**.
- O aplicativo utiliza apenas uma **chave publicável** do Supabase; funções privilegiadas rodam no servidor.
- Pedidos cancelados e arquivados são preservados para auditoria e não entram no valor ativo da conferência.
- O GitHub público contém o código da aplicação, **não os pedidos ou senhas dos colaboradores**.

> Armazenamento na nuvem não substitui política de backup. Antes de uso definitivo, é necessário validar rotinas de recuperação, fluxos operacionais e critérios de cobrança.

## Estrutura do repositório

```text
.
├── index.html                      Portal oficial do produto
├── acesso/index.html               Entrada única dos usuários
├── app/                            Frontend autenticado e relatórios
├── produto/                        Página comercial detalhada
├── demo/                           Simulação isolada com dados fictícios
├── legado/                         Formulário histórico preservado
├── assets/                         Logomarca e recursos visuais
├── supabase/
│   ├── schema.sql                  Estrutura inicial e RLS
│   ├── realtime.sql                Atualizações dos pedidos
│   ├── managed-accounts.sql        Perfis e permissões
│   └── functions/manage-users/     Gestão segura de usuários
├── docs/                           Manuais, arquitetura e implantação
├── tests/                          Testes de regras, login e relatórios
└── README.md
```

## Como testar

### Demonstração para portfólio

1. Abra [a demonstração](https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/demo/).
2. Escolha **Colaborador**, monte uma refeição e registre um pedido fictício.
3. Alterne para **Restaurante** e acompanhe as solicitações.
4. Abra **Gestão RL** para visualizar o fechamento e a relação nominal.

A demo não grava dados no Supabase real.

### Desenvolvimento local

```bash
git clone https://github.com/lionzionion/pedidos-almoco-Rlconstrucoes.git
cd pedidos-almoco-Rlconstrucoes
python -m http.server 8000
```

Abra `http://localhost:8000/`. Para rodar testes de regras e estrutura (Node.js instalado):

```bash
node --test tests/*.test.cjs
```

A publicação do frontend é estática. Para usar outro projeto Supabase, configure `app/config.js` com URL e **chave publicável**, depois aplique as migrações conforme [documentação técnica](docs/03-ARQUITETURA-E-SEGURANCA.md). **Nunca publique chaves secretas ou de serviço.**

## Documentação

- [Visão geral e estudo de caso](docs/01-VISAO-GERAL.md)
- [Guia de uso: colaborador, restaurante e administração](docs/02-GUIA-USO.md)
- [Arquitetura, banco de dados e segurança](docs/03-ARQUITETURA-E-SEGURANCA.md)
- [Implantação e roteiro de apresentação](docs/04-IMPLANTACAO-E-APRESENTACAO.md)
- [Links e mensagem para compartilhar com a equipe](docs/05-COMPARTILHAR-ACESSO.md)
- [Identidade do repositório e configuração do GitHub](docs/06-GITHUB-PERFIL.md)

## Status e próximos marcos

| Área | Situação |
|---|---|
| Interface responsiva e cardápios | Implementado |
| Contas e permissões de colaborador, restaurante e ADM | Implementado; testes de campo pendentes |
| Painel de restaurante e conferência | Implementado; homologação pendente |
| Relatórios PDF, impressão e CSV | Implementado; validação nos dispositivos pendente |
| Backups testados e rotina de recuperação | Pendente |
| Horários de corte, remessas múltiplas e fechamento ampliado | Evolução prevista |

**Projeto desenvolvido para resolver uma necessidade concreta da operação em obra, unindo engenharia, gestão e desenvolvimento de software.**

<div align="center"><sub>RL Engenharia · Fazendo Acontecer · Pernambuco, Brasil</sub></div>
