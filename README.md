# Validação Frontend

Dashboard de validação de vendas desenvolvido com **Angular 21** e **Bootstrap 5**.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- [npm](https://www.npmjs.com/) v11 (definido no projeto)
- Backend rodando em `http://localhost:8000` (ver seção [API](#api))

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
cd dashboard-frontend
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
│   │   ├── gauge/       # Gauge circular de status
│   │   ├── kpi/         # Cards de indicadores (KPI)
│   │   └── sidebar/     # Navegação lateral com collapse
│   ├── models/
│   │   └── shared/      # Tipos e interfaces compartilhados
│   ├── pipes/
│   │   └── cnpj.pipe    # Formatação de CNPJ
│   ├── services/
│   │   └── historico.service  # Integração com a API
│   ├── views/
│   │   └── dashboard/   # Página principal do dashboard
│   ├── mocks/           # Dados mockados para desenvolvimento/testes
│   ├── app.routes.ts    # Definição de rotas
│   └── app.config.ts    # Configuração da aplicação
├── styles.scss          # Estilos globais
└── main.ts              # Ponto de entrada da aplicação
```

## Rotas

| Rota | Componente |
|---|---|
| `/` | Redireciona para `/dashboard` |
| `/dashboard` | Página principal do dashboard |

## API

A aplicação consome os seguintes endpoints do backend (`http://localhost:8000`):

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/historico` | Lista o histórico de todas as farmácias |
| `GET` | `/historico/:associacao` | Histórico filtrado por associação |
| `POST` | `/comparar` | Dispara uma nova comparação |
| `GET` | `/ultima-atualizacao` | Retorna `{ atualizado_em: "..." }` com a data da última atualização |

## Tecnologias

- [Angular 21](https://angular.dev/)
- [Bootstrap 5](https://getbootstrap.com/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [TypeScript 5.9](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/) — testes unitários
- [SCSS](https://sass-lang.com/) — estilização
