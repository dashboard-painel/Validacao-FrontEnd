# Finora Frontend

Dashboard frontend desenvolvido com **Angular 21** e **Bootstrap 5**.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- [npm](https://www.npmjs.com/) v11 (definido no projeto)
- [Angular CLI](https://angular.dev/tools/cli) v21

Instale o Angular CLI globalmente, caso ainda não tenha:

```bash
npm install -g @angular/cli
```

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
│   │   ├── gauge/       # Componente de gauge
│   │   ├── kpi/         # Componente de KPI
│   │   └── navbar/      # Barra de navegação
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

## Tecnologias

- [Angular 21](https://angular.dev/)
- [Bootstrap 5](https://getbootstrap.com/)
- [TypeScript 5.9](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/) — testes unitários
- [SCSS](https://sass-lang.com/) — estilização
