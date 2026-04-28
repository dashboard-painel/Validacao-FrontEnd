# Validação Frontend

Painel de validação de vendas desenvolvido com **Angular 21** e **Bootstrap 5**. Oferece duas visões principais: monitoramento do envio de histórico pelas farmácias e acompanhamento de vendas a parceiros.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- [npm](https://www.npmjs.com/) v11 (definido no projeto via `packageManager`)
- Backend rodando em `http://localhost:8000` (ver seção [API](#api))

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
cd Validacao-FrontEnd
npm install
```

## Rodando o projeto

Inicie o servidor de desenvolvimento:

```bash
npm start
```

Acesse no navegador: [http://localhost:4200](http://localhost:4200)

> A aplicação recarrega automaticamente ao salvar qualquer arquivo fonte.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção em `dist/` |
| `npm run watch` | Build em modo watch (desenvolvimento) |
| `npm test` | Executa os testes unitários com [Vitest](https://vitest.dev/) |

## Estrutura do projeto

```
src/
├── app/
│   ├── components/
│   │   ├── causa-badge/          # Badge de causa do problema
│   │   ├── classificacao-badge/  # Badge de classificação da farmácia
│   │   ├── delayed-stores-table/ # Tabela de lojas com atraso
│   │   ├── gauge/                # Gauge circular de status
│   │   ├── global-filter-bar/    # Barra de filtros global
│   │   ├── kpi/                  # Cards de indicadores (KPI)
│   │   ├── sidebar/              # Navegação lateral colapsável
│   │   ├── sit-contrato-badge/   # Badge de situação de contrato
│   │   ├── status-bar/           # Barra de status geral
│   │   └── store-detail-modal/   # Modal de detalhes da loja
│   ├── data/
│   │   └── coletor-schedule.data # Dados estáticos de agenda do coletor
│   ├── models/
│   │   └── shared/               # Tipos e interfaces (farmacia, dashboard, venda-parceiro)
│   ├── pipes/
│   │   └── cnpj.pipe             # Formatação de CNPJ
│   ├── services/
│   │   ├── historico.service     # Integração com a API de histórico
│   │   ├── theme.service         # Gerenciamento de tema claro/escuro
│   │   └── vendas-parceiros.service # Integração com a API de vendas a parceiros
│   ├── views/
│   │   ├── dashboard/            # Página de validação de histórico das farmácias
│   │   └── vendas/               # Página de vendas a parceiros
│   ├── app.routes.ts             # Definição de rotas
│   └── app.config.ts             # Configuração da aplicação
├── styles.scss                   # Estilos globais + variáveis de tema
└── main.ts                       # Ponto de entrada da aplicação
```

## Funcionalidades

### Dashboard — Validação de Histórico

- **Atualização automática** — dados recarregados a cada 30 s sem intervenção do usuário
- **KPIs** — total de lojas, lojas OK, divergentes e sem dados, com comparativo em relação à sessão anterior
- **Gauge de status** — visualização circular da proporção de lojas em dia
- **Tabela de lojas com atraso** — ordenada por associação, com coluna de atraso em horas/dias e camadas problemáticas destacadas (atrasos > 48 h exibidos em dias)
- **Modal de detalhes** — informações completas de uma loja ao clicar na linha
- **Filtros avançados** — por associação, código Farma, CNPJ, nome, camada problemática e status
- **Sidebar colapsável** — recolhe para ícones em telas grandes; exibe a data da última atualização do backend

### Vendas — Parceiros

- **Atualização automática** — histórico recarregado a cada 60 s; última atualização do backend a cada 30 s
- **Atualização manual** — botão para forçar nova consulta ao Redshift via backend
- **KPIs** — total, ativas, inativas e com venda nas últimas 24 h
- **Tabela com virtual scroll** — carregamento progressivo (60 linhas por vez) via scroll
- **Ordenação** — por associação, código Farma, nome ou data da última venda
- **Filtros** — por associação, situação de contrato, nome e código Farma; presets rápidos (Todas / Ativas / Inativas / Venda 24 h)
- **Badges de recência** — indicam se a última venda foi há menos de 24 h (OK), entre 24–72 h (alerta) ou mais de 72 h (crítico)

### Geral

- **Tema claro/escuro** — alternância com persistência em `localStorage`; respeita a preferência do sistema operacional

## Rotas

| Rota | Componente |
|---|---|
| `/` | Redireciona para `/dashboard` |
| `/dashboard` | Validação de histórico das farmácias |
| `/vendas` | Acompanhamento de vendas a parceiros |
| `**` | Redireciona para `/dashboard` |

## API

A aplicação consome os seguintes endpoints do backend (`http://localhost:8000`):

### Histórico de farmácias

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/historico` | Lista o histórico de todas as farmácias |
| `GET` | `/historico/:associacao` | Histórico filtrado por associação |
| `POST` | `/comparar` | Compara sessões de uma associação (`{ associacao }`) |
| `GET` | `/ultima-atualizacao` | Data da última atualização `{ atualizado_em }` |

### Vendas a parceiros

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/vendas-parceiros/historico` | Lista o histórico de vendas a parceiros |
| `GET` | `/vendas-parceiros` | Força nova consulta ao Redshift e retorna resultado |
| `GET` | `/vendas-parceiros/ultima-atualizacao` | Data da última atualização `{ atualizado_em }` |

## Tecnologias

- [Angular 21](https://angular.dev/)
- [Bootstrap 5](https://getbootstrap.com/)
- [Bootstrap Icons 1.13](https://icons.getbootstrap.com/) — carregado via CDN
- [Inter](https://fonts.google.com/specimen/Inter) — fonte via Google Fonts
- [TypeScript 5.9](https://www.typescriptlang.org/)
- [Vitest 4.x](https://vitest.dev/) — testes unitários
- [SCSS](https://sass-lang.com/) — estilização com variáveis de tema
- [Prettier](https://prettier.io/) — formatação de código
