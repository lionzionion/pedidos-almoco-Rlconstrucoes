# Configuração profissional do GitHub — RL Pedidos

O código, o README e a documentação já estão organizados. Para o projeto aparecer com **descrição e endereço na seção Pinned**, o GitHub utiliza os metadados da área **About** do repositório.

## 1. Preencher os campos About

Repositório: https://github.com/lionzionion/pedidos-almoco-Rlconstrucoes

Abra a página do repositório, procure **About** na coluna lateral direita e clique na **engrenagem**.

**Description** (copiar e colar):

```text
Sistema web de gestão de refeições em obras: pedidos, restaurante, controle de acessos, relatórios PDF e conferência financeira. JavaScript + Supabase.
```

**Website**:

```text
https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/
```

**Topics** (adicionar um por vez):

```text
javascript
supabase
postgresql
engenharia-civil
gestao-de-obras
construction-tech
github-pages
relatorios-pdf
```

Marque a opção para mostrar o link do Website, se aparecer, e clique em **Save changes**. Assim o cartão já fixado no seu perfil passa a mostrar a descrição do sistema.

> Atenção: os campos About/Website/Topics são **configurações do repositório**, e não do arquivo README. O conector GitHub utilizado nesta etapa permite atualizar arquivos, mas **não permite alterar diretamente os metadados do repositório**. Esses campos precisam ser salvos no GitHub pelo proprietário.

## 2. Nome do repositório e endereço

Nome escolhido para a RL:

```text
pedidos-almoco-Rlconstrucoes
```

O proprietário deve salvar esse nome em **Settings → General → Repository name → Rename**. Os links do README e do site já estão preparados para o novo endereço. Como o GitHub Pages muda de caminho ao renomear o repositório, teste o acesso em **Settings → Pages** após a publicação.

## 3. Publicar um domínio próprio (opcional)

Se a empresa **já possuir um domínio**, é possível usar um subdomínio próprio, como `pedidos.DOMINIO-DA-EMPRESA` (apenas exemplo, não registrado).

É necessário:
1. Ser proprietário do domínio e ter acesso ao DNS.
2. Configurar o registro DNS conforme as instruções exibidas pelo GitHub Pages.
3. Definir o **Custom domain** em **Settings → Pages**.
4. Validar HTTPS, redirecionamentos e os links de acesso.

**Não existe domínio próprio configurado automaticamente**. Até isso acontecer, o endereço oficial é o GitHub Pages existente.

## 4. Pins e apresentação de portfólio

No perfil https://github.com/lionzionion, escolha **Customize your pins** e mantenha o projeto RL entre os destaques. Se ele já está fixado, apenas atualize a descrição About.

Resumo sugerido para sua apresentação profissional:

> **RL Pedidos — Construction Tech:** sistema criado para resolver o controle de refeições de uma obra real. Integra autenticação, perfis de colaborador/restaurante/gestão, pedidos em tempo real, relatórios PDF e conferência de pagamentos. Desenvolvido com JavaScript, Supabase e PostgreSQL.

O primeiro bloco do `README.md` já está pronto para exibição pública e contém o logo RL, links para sistema, demo, arquitetura, recursos, segurança e limites da implantação.

## 5. Endereço limpo para divulgação

- **Usuários:** https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/acesso/
- **Apresentação:** https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/
- **Demonstração:** https://lionzionion.github.io/pedidos-almoco-Rlconstrucoes/demo/

O sufixo `?utm_source=...` não faz parte do nome do projeto; é um parâmetro de rastreamento que alguns sistemas acrescentam ao abrir um link. O site remove parâmetros comuns da barra de endereço, e os links acima já estão escritos sem esses parâmetros.

**Não publique senhas ou dados reais de colaboradores no GitHub.** A demonstração usa informações fictícias.
