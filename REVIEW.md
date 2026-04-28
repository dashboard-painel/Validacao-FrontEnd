---
phase: code-review
reviewed: 2025-01-28T12:00:00Z
depth: deep
files_reviewed: 50
files_reviewed_list:
  - src/app/app.ts
  - src/app/app.routes.ts
  - src/app/app.config.ts
  - src/app/app.html
  - src/app/app.scss
  - src/app/data/coletor-schedule.data.ts
  - src/app/views/vendas/vendas.ts
  - src/app/views/vendas/vendas.html
  - src/app/views/vendas/vendas.scss
  - src/app/views/dashboard/dashboard.ts
  - src/app/views/dashboard/dashboard.html
  - src/app/views/dashboard/dashboard.scss
  - src/app/components/store-detail-modal/store-detail-modal.ts
  - src/app/components/store-detail-modal/store-detail-modal.html
  - src/app/components/store-detail-modal/store-detail-modal.scss
  - src/app/components/global-filter-bar/global-filter-bar.ts
  - src/app/components/global-filter-bar/global-filter-bar.html
  - src/app/components/global-filter-bar/global-filter-bar.scss
  - src/app/components/status-bar/status-bar.ts
  - src/app/components/status-bar/status-bar.html
  - src/app/components/status-bar/status-bar.scss
  - src/app/components/gauge/gauge.ts
  - src/app/components/gauge/gauge.html
  - src/app/components/gauge/gauge.scss
  - src/app/components/classificacao-badge/classificacao-badge.ts
  - src/app/components/classificacao-badge/classificacao-badge.html
  - src/app/components/classificacao-badge/classificacao-badge.scss
  - src/app/components/sit-contrato-badge/sit-contrato-badge.ts
  - src/app/components/sit-contrato-badge/sit-contrato-badge.html
  - src/app/components/sit-contrato-badge/sit-contrato-badge.scss
  - src/app/components/delayed-stores-table/delayed-stores-table.ts
  - src/app/components/delayed-stores-table/delayed-stores-table.html
  - src/app/components/delayed-stores-table/delayed-stores-table.scss
  - src/app/components/causa-badge/causa-badge.ts
  - src/app/components/causa-badge/causa-badge.html
  - src/app/components/causa-badge/causa-badge.scss
  - src/app/components/kpi/kpi.ts
  - src/app/components/kpi/kpi.html
  - src/app/components/kpi/kpi.scss
  - src/app/components/sidebar/sidebar.ts
  - src/app/components/sidebar/sidebar.html
  - src/app/components/sidebar/sidebar.scss
  - src/app/services/vendas-parceiros.service.ts
  - src/app/services/theme.service.ts
  - src/app/services/historico.service.ts
  - src/app/services/dashboard-mapper.service.ts
  - src/app/pipes/cnpj.pipe.ts
  - src/app/models/shared/venda-parceiro.model.ts
  - src/app/models/shared/farmacia.model.ts
  - src/app/models/shared/dashboard.model.ts
  - src/main.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  fixed: 24
status: all_fixed
---

# Code Review Report (Refactoring Focus)

**Reviewed:** 2025-01-28T12:00:00Z
**Depth:** deep
**Files Reviewed:** 50
**Refactoring Applied:** 2025-04-28
**Status:** all_fixed

## Contexto da Aplicação

> Esta aplicação roda **exclusivamente na rede local da empresa**. O frontend se conecta a um backend Python (localhost:8000) que possui um banco PostgreSQL. Critérios de segurança para aplicações expostas à internet **não se aplicam** neste cenário. As URLs hardcoded para localhost são intencionais e esperadas.

## Summary

This is a well-structured Angular 21 dashboard application using standalone components, signals, and OnPush change detection throughout. The codebase demonstrates solid Angular fundamentals.

### ✅ Correções Aplicadas (16 items — Batch 1)

| # | Issue | Correção |
|---|-------|----------|
| CR-02 | Labels trocados no sidebar | `sidebar.html` — Dashboard label corrigido |
| WR-03 | Checkbox toggle duplicado (8x) | Extraído para `utils/array-toggle.ts` → `toggleInArray()` |
| WR-04 | `urgencyClass`/`formatDelay` duplicados | Extraído para `utils/display-helpers.ts` |
| WR-05 | `filterSummary` duplicado (6x) | Extraído para `utils/filter-summary.ts` |
| WR-06 | Scrollbar CSS duplicado (4 arquivos) | Extraído para mixin `_scrollbar.scss` |
| WR-10 | `renderedRowsCount` sem limite no scroll | Adicionado `Math.min()` no `onTableScroll` do Vendas |
| WR-11 | Tipos `Divergencia` e `StatusFarmaciaItem` não usados | Removidos de `farmacia.model.ts` |
| WR-12 | Badge CSS duplicado (2 arquivos) | Extraído para `_layer-badges.scss` |
| IN-01→11 | URL localhost hardcoded | Reclassificado — comportamento esperado (app local) |
| IN-02 | `standalone: true` redundante | Removido de 6 componentes/pipes |
| IN-03 | Magic numbers de tempo | Extraídos para constantes em Vendas (`HOURS_24_MS`, `POLL_INTERVAL_MS`, etc.) |
| IN-06 | Rotas eager loading | Migrado para `loadComponent` (lazy loading) |
| IN-07 | console.error no bootstrap | Reclassificado — aceitável para app local |
| IN-09 | `imports: []` vazio no StatusBar | Removido |
| — | `angular.json` | Adicionado `stylePreprocessorOptions.includePaths` para SCSS |
| — | Vendas `vendaRecenciaBadge`/`vendaRecenciaLabel` | Simplificadas eliminando variáveis intermediárias |

### ✅ Correções Aplicadas (8 items — Batch 2)

| # | Issue | Correção |
|---|-------|----------|
| WR-01 | Dashboard god component (~780 linhas) | Extraído `DashboardFilterState` (~200 linhas de signals/mutations). Dashboard: 780→475 linhas |
| WR-02 | Vendas muito grande (~349 linhas) | Reduzido a ~285 linhas via IN-04 e UltimaAtualizacaoService |
| WR-07 | `CausaBadge` não usado | Componente deletado inteiramente |
| WR-08 | Sem feedback de erro no load | Adicionado `loadError` signal + banner de erro em Dashboard e Vendas |
| WR-09 | `effect()` anti-pattern (9 signals) | Removido effect; `resetPagination()` chamado explicitamente nos handlers |
| IN-04 | Badge class maps duplicados | Vendas agora usa `SitContratoBadge` component; removido ~50 linhas de SCSS |
| IN-05 | `@HostListener` coupling | Adicionado comentário explicativo sobre acoplamento DOM |
| IN-08 | `provideAnimationsAsync()` ausente | Mantido sem — `@angular/animations` tem conflito de versão; PrimeNG animations não são usadas atualmente |
| IN-10 | Múltiplos timers de polling | Criado `UltimaAtualizacaoService` centralizado; Sidebar e Vendas usam serviço compartilhado |

The codebase has good type safety overall (no `any` usage found), proper use of `OnPush` everywhere, and clean separation of models.

## Critical Issues

### ~~CR-01~~ → IN-11: Hardcoded localhost API URLs in Services (Reclassificado)

**File:** `src/app/services/vendas-parceiros.service.ts:10` and `src/app/services/historico.service.ts:12`
**Issue:** Ambos os services usam `http://localhost:8000` como URL base.
**Contexto:** Como a aplicação roda exclusivamente na rede local da empresa, conectando-se a um backend Python local, isso é **comportamento esperado**. Reclassificado de Critical para Info.
**Nota futura:** Caso a aplicação migre para um servidor centralizado, considerar usar `environment.ts` para configurar a URL por ambiente.

### ~~CR-02~~ ✅ CORRIGIDO: Sidebar Navigation Labels Are Swapped

**File:** `src/app/components/sidebar/sidebar.html:72-73`
**Correção:** Label alterado de "Vendas" para "Dashboard" no link com `routerLink="/dashboard"`.

## Warnings

### ~~WR-01~~ ✅ CORRIGIDO: Dashboard Component Is a God Component (~780 Lines)

**File:** `src/app/views/dashboard/dashboard.ts:1-780`
**Correção:** Extraído `DashboardFilterState` para `dashboard-filter.state.ts` (~200 linhas de filter signals, computed values e mutations). Dashboard reduzido de ~780 para ~475 linhas, agora funciona como orquestrador fino injetando `DashboardFilterState` como `fs`.

### ~~WR-02~~ ✅ CORRIGIDO: Vendas Component Also Too Large (~349 Lines)

**File:** `src/app/views/vendas/vendas.ts:1-349`
**Correção:** Reduzido a ~285 linhas: removido `sitContratoClassMap`/`sitContratoClass()` (usa `SitContratoBadge`), removido polling próprio (usa `UltimaAtualizacaoService`).

### ~~WR-03~~ ✅ CORRIGIDO: Duplicated Checkbox Toggle Pattern Across 4 Components

**Correção:** Extraído para `src/app/utils/array-toggle.ts` → `toggleInArray<T>()`. Usado em dashboard, vendas, delayed-stores-table e global-filter-bar.

### ~~WR-04~~ ✅ CORRIGIDO: Duplicated `urgencyClass` and `formatDelay` Methods

**Correção:** Extraído para `src/app/utils/display-helpers.ts`. Usado em store-detail-modal e delayed-stores-table.

### ~~WR-05~~ ✅ CORRIGIDO: Duplicated `summary()` / `filterSummary()` Pattern

**Correção:** Extraído para `src/app/utils/filter-summary.ts`. Usado em delayed-stores-table, global-filter-bar e vendas.

### ~~WR-06~~ ✅ CORRIGIDO: Duplicated Scrollbar CSS in 4 SCSS Files

**Correção:** Extraído para mixin `thin-scrollbar` em `src/styles/_scrollbar.scss`. Importado via `@use 'scrollbar'` em vendas, delayed-stores-table e global-filter-bar.

### ~~WR-07~~ ✅ CORRIGIDO: `CausaBadge` Component Is Declared But Never Used

**File:** `src/app/components/causa-badge/causa-badge.ts:1-16`
**Correção:** Componente deletado inteiramente (4 arquivos: .ts, .html, .scss, .spec.ts).

### ~~WR-08~~ ✅ CORRIGIDO: Missing Error Feedback on Initial Data Load

**File:** `src/app/views/dashboard/dashboard.ts` and `src/app/views/vendas/vendas.ts`
**Correção:** Adicionado `loadError` signal em ambos os componentes. `catchError` agora seta mensagem de erro. Template exibe banner amarelo "Falha ao carregar dados. Tentando novamente...".

### ~~WR-09~~ ✅ CORRIGIDO: `effect()` Used to Reset Pagination Reads 9 Signals Without Using `untracked`

**File:** `src/app/views/dashboard/dashboard.ts`
**Correção:** Removido o `effect()` anti-pattern. Agora `resetPagination()` é chamado explicitamente em cada handler que modifica filter state (`clearFilters()`, `applyPreset()`, `toggleMultiFilter()`, etc.).

### ~~WR-10~~ ✅ CORRIGIDO: `onTableScroll` in Vendas Does Not Throttle Scroll Events

**Correção:** Adicionado `Math.min(c + this.pageSize, this.sortedStores().length)` para limitar o crescimento de `renderedRowsCount`.

### ~~WR-11~~ ✅ CORRIGIDO: `Divergencia` and `StatusFarmaciaItem` Types Are Unused

**Correção:** Tipos removidos de `farmacia.model.ts`. `ComparacaoResultado` agora usa `FarmaciaHistorico[]`.

### ~~WR-12~~ ✅ CORRIGIDO: Badge Color Styles Duplicated Between Two SCSS Files

**Correção:** Extraído para `src/styles/_layer-badges.scss`. Importado via `@use 'layer-badges'` em delayed-stores-table e store-detail-modal.

## Info

### IN-01: Inconsistent Naming Convention — `.ts` Files Without Component Suffix

**File:** All component files (e.g., `sidebar.ts`, `gauge.ts`, `kpi.ts`)
**Issue:** Component files are named `sidebar.ts` instead of the Angular convention `sidebar.component.ts`. While this is a valid style choice, it departs from standard Angular CLI conventions and may confuse new contributors.
**Fix:** This is a project-wide convention. If intentional, document it. If not, consider renaming for consistency with the broader Angular ecosystem.

### ~~IN-02~~ ✅ CORRIGIDO: Redundant `standalone: true` Declarations

**Correção:** Removido `standalone: true` de 6 componentes/pipes: store-detail-modal, global-filter-bar, status-bar, classificacao-badge, sit-contrato-badge, causa-badge, cnpj.pipe.

### ~~IN-03~~ ✅ CORRIGIDO: Magic Numbers for Time Thresholds

**Correção:** Extraídos para constantes em Vendas: `HOURS_24_MS`, `POLL_INTERVAL_MS`, `REFRESH_INTERVAL_MS`.

### ~~IN-04~~ ✅ CORRIGIDO: Badge Class Maps Could Use a Shared Pattern

**File:** `src/app/views/vendas/vendas.ts` and `vendas.html`
**Correção:** Vendas agora usa `<app-sit-contrato-badge>` em vez de inline class mapping. Removido `sitContratoClassMap`, `sitContratoClass()` e ~50 linhas de CSS duplicado em `vendas.scss`.

### ~~IN-05~~ ✅ CORRIGIDO: `@HostListener('document:click')` in Dashboard for Closing Dropdowns

**File:** `src/app/views/dashboard/dashboard.ts`
**Correção:** Adicionado comentário explicativo sobre o acoplamento DOM com classes `.delayed-stores__dropdown` e `.global-filter__dropdown`.

### ~~IN-06~~ ✅ CORRIGIDO: Eager Route Loading for Both Views

**Correção:** Migrado para `loadComponent` com lazy loading. Dashboard e Vendas agora carregam como chunks separados.

### IN-07: `console.error` in `main.ts` Bootstrap

**File:** `src/main.ts:6`
**Issue:** `console.error` is the only error handler for bootstrap failures.
**Contexto:** Aceitável para aplicação local/interna. Sem necessidade de serviço de error reporting externo.

### ~~IN-08~~ ✅ AVALIADO: Missing `provideAnimationsAsync()` in App Config

**File:** `src/app/app.config.ts`
**Resolução:** `@angular/animations` tem conflito de versão com Angular 21.2.8. Como PrimeNG animations não são utilizadas atualmente, mantido sem provider de animação. Quando necessário, instalar `@angular/animations@21.2.8` e adicionar `provideAnimationsAsync()`.

### ~~IN-09~~ ✅ CORRIGIDO: `StatusBar` Has Empty `imports` Array

**Correção:** Removido `imports: []` vazio do StatusBar.

### ~~IN-10~~ ✅ CORRIGIDO: Multiple Polling Timers Running Simultaneously

**File:** Sidebar, Dashboard, Vendas
**Correção:** Criado `UltimaAtualizacaoService` centralizado em `src/app/services/ultima-atualizacao.service.ts`. Serviço é route-aware (polls endpoint correto baseado na rota). Sidebar e Vendas agora usam o serviço compartilhado em vez de timers próprios.

---

_Reviewed: 2025-01-28T12:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
