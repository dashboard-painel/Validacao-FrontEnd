# Guia de Integração — Frontend

API rodando em `http://localhost:8000` (ajustar para o host de produção).

---

## Fluxo recomendado para o dashboard

```
1. Ao abrir o frontend
   └─ GET /historico  →  tabela com TODAS as farmácias de TODAS as associações

2. Usuário quer filtrar por uma associação específica
   └─ GET /historico/{associacao}  →  mesma estrutura, só uma associação

3. Usuário dispara nova comparação (botão "Atualizar")
   └─ POST /comparar  →  executa queries no Redshift e atualiza o banco local
      └─ após o POST, recarregue GET /historico para refletir os novos dados

4. (Opcional) Verificar quando foi a última atualização geral
   └─ GET /ultima-atualizacao  →  data/hora da comparação mais recente

5. (Opcional) Verificar status do Business Connect por farmácia
   └─ GET /status-farmacias  →  lista de farmácias com status do coletor (sem ir ao Redshift)

6. (Opcional) Consultar status do Coletor BI para uma farmácia específica
   └─ GET /coletor/{codigo}  →  última venda registrada no Coletor BI
```

---

## Endpoints

### `GET /historico` — Todas as farmácias de todas as associações

Tela inicial: carrega automaticamente a tabela completa com todas as farmácias de todas as associações que possuem comparações salvas.

**URL:**
```
GET http://localhost:8000/historico
```

**Resposta (200):** array de objetos com a estrutura completa abaixo.

```json
[
  {
    "associacao": "80",
    "cod_farmacia": "30559",
    "nome_farmacia": "FRANQUIA PLANALTO",
    "cnpj": "12345678000199",
    "ultima_venda_GoldVendas": "2026-04-08",
    "ultima_hora_venda_GoldVendas": "2026-04-08 18:30:00",
    "ultima_venda_SilverSTGN_Dedup": "2026-04-14",
    "ultima_hora_venda_SilverSTGN_Dedup": "18:55:10",
    "coletor_novo": "Pendente de envio no dia 2026-04-10",
    "coletor_bi_ultima_data": "2026-04-10",
    "coletor_bi_ultima_hora": "18:30:00",
    "tipo_divergencia": "data_diferente",
    "camadas_atrasadas": ["GoldVendas", "API"],
    "camadas_sem_dados": null,
    "atualizado_em": "2026-04-21 10:00:00"
  },
  {
    "associacao": "120",
    "cod_farmacia": "11111",
    "nome_farmacia": "FARMÁCIA CENTRAL",
    "cnpj": "98765432000100",
    "ultima_venda_GoldVendas": "2026-04-20",
    "ultima_hora_venda_GoldVendas": "2026-04-20 09:10:00",
    "ultima_venda_SilverSTGN_Dedup": "2026-04-20",
    "ultima_hora_venda_SilverSTGN_Dedup": "09:10:00",
    "coletor_novo": "OK, sem registro",
    "coletor_bi_ultima_data": "2026-04-20",
    "coletor_bi_ultima_hora": "09:10:00",
    "tipo_divergencia": null,
    "camadas_atrasadas": null,
    "camadas_sem_dados": null,
    "atualizado_em": "2026-04-21 10:00:00"
  }
]
```

**Exemplo JS:**
```js
const res = await fetch('http://localhost:8000/historico');
const farmacias = await res.json();
// Para filtrar por associação no frontend: farmacias.filter(f => f.associacao === '80')
```

---

### `GET /historico/{associacao}` — Farmácias de uma associação específica

Retorna o estado atual de todas as farmácias de uma associação (dados da última comparação executada para ela).

**URL:**
```
GET http://localhost:8000/historico/80
```

**Resposta (200):** mesma estrutura de `/historico`, mas filtrada por associação.

```json
[
  {
    "associacao": "80",
    "cod_farmacia": "30559",
    "nome_farmacia": "FRANQUIA PLANALTO",
    "cnpj": "12345678000199",
    "ultima_venda_GoldVendas": "2026-04-08",
    "ultima_hora_venda_GoldVendas": "2026-04-08 18:30:00",
    "ultima_venda_SilverSTGN_Dedup": "2026-04-14",
    "ultima_hora_venda_SilverSTGN_Dedup": "18:55:10",
    "coletor_novo": "Pendente de envio no dia 2026-04-10",
    "coletor_bi_ultima_data": "2026-04-10",
    "coletor_bi_ultima_hora": "18:30:00",
    "tipo_divergencia": "data_diferente",
    "camadas_atrasadas": ["GoldVendas", "API"],
    "camadas_sem_dados": null,
    "atualizado_em": "2026-04-21 10:00:00"
  }
]
```

**Campos da resposta:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `associacao` | string \| null | Código da associação |
| `cod_farmacia` | string | Código da farmácia |
| `nome_farmacia` | string \| null | Nome da farmácia |
| `cnpj` | string \| null | CNPJ somente com dígitos (sem `.` `-` `/`) |
| `ultima_venda_GoldVendas` | string \| null | Última venda em `associacao.vendas` (YYYY-MM-DD) |
| `ultima_hora_venda_GoldVendas` | string \| null | Timestamp da última venda em `associacao.vendas` |
| `ultima_venda_SilverSTGN_Dedup` | string \| null | Última venda em `silver.cadcvend_staging_dedup` (YYYY-MM-DD) |
| `ultima_hora_venda_SilverSTGN_Dedup` | string \| null | Hora da última venda em `silver.cadcvend_staging_dedup` (HH:MM:SS) |
| `coletor_novo` | string \| null | Status no Business Connect (ver tabela abaixo) |
| `coletor_bi_ultima_data` | string \| null | Data da última venda no Coletor BI (YYYY-MM-DD) |
| `coletor_bi_ultima_hora` | string \| null | Hora da última venda no Coletor BI (HH:MM:SS) |
| `tipo_divergencia` | string \| null | Tipo de divergência — `null` se não há divergência |
| `camadas_atrasadas` | string[] \| null | Camadas com dado mas desatualizado — `null` se nenhuma |
| `camadas_sem_dados` | string[] \| null | Camadas sem nenhum registro de venda — `null` se nenhuma |
| `atualizado_em` | string \| null | Data/hora em que a comparação foi executada |
| `sit_contrato` | string \| null | Situação do contrato da farmácia (ex.: `"Ativo"`, `"Inativo"`) |
| `possivel_causa` | string \| null | Possível causa do atraso ou divergência (ex.: `"Pipeline falhou"`) |

**Valores de `camadas_atrasadas`:**

| Valor | Camada | Critério |
|-------|--------|----------|
| `"GoldVendas"` | `associacao.vendas` | `ultima_venda_GoldVendas` anterior a D-1 (D-2 ou mais antigo) |
| `"SilverSTGN_Dedup"` | `silver.cadcvend_staging_dedup` | `ultima_venda_SilverSTGN_Dedup` anterior a D-1 (D-2 ou mais antigo) |
| `"API"` | Business Connect | `"Pendente de envio"` com data igual ou anterior a D-1 |

Exemplos:
- `["GoldVendas", "API"]` — atraso em Gold e no coletor
- `["SilverSTGN_Dedup"]` — atraso somente em Silver
- `null` — sem atraso em nenhuma camada

**Valores de `camadas_sem_dados`:**

| Valor | Significa |
|-------|-----------|
| `"GoldVendas"` | Farmácia sem nenhum registro em `associacao.vendas` |
| `"SilverSTGN_Dedup"` | Farmácia sem nenhum registro em `silver.cadcvend_staging_dedup` |

Exemplos:
- `["GoldVendas"]` — farmácia existe só no Silver
- `["GoldVendas", "SilverSTGN_Dedup"]` — sem dados em nenhuma fonte (improvável)
- `null` — ambas as fontes têm dado

**Valores de `coletor_novo`:**

| Valor | Significa |
|-------|-----------|
| `"OK, sem registro"` | Farmácia sem pendência de envio |
| `"Pendente de envio no dia YYYY-MM-DD"` | Pendência registrada — a data indica quando foi capturada |
| `"Indisponível"` | Business Connect não respondeu (temporário) |

**Valores de `tipo_divergencia`:**

| Valor | Significa |
|-------|-----------|
| `null` | Sem divergência — datas iguais nas duas fontes |
| `"data_diferente"` | Presente nas duas fontes, mas com datas distintas |
| `"apenas_gold_vendas"` | Presente somente em `associacao.vendas` |
| `"apenas_silver_stgn_dedup"` | Presente somente em `silver.cadcvend_staging_dedup` |

**Erros:**

| Código | Descrição |
|--------|-----------|
| `404` | Nenhuma comparação encontrada para a associação |
| `503` | Erro ao acessar o banco local |

**Exemplo JS:**
```js
async function buscarDetalhes(associacao) {
  const res = await fetch(`http://localhost:8000/historico/${associacao}`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json(); // array de farmácias
}
```

---

### `POST /comparar` — Disparar nova comparação

Executa as queries no Redshift, consulta o Business Connect e o Coletor BI, e salva o resultado no banco local. Use quando o usuário quiser atualizar os dados.

**URL:**
```
POST http://localhost:8000/comparar
Content-Type: application/json
```

**Body:**
```json
{ "associacao": "80" }
```

**Resposta (200):**
```json
{
  "associacao": "80",
  "total_gold_vendas": 64,
  "total_silver_stgn_dedup": 74,
  "total_divergencias": 36,
  "comparacao_id": 3,
  "divergencias": [
    {
      "cod_farmacia": "30559",
      "nome_farmacia": "FRANQUIA PLANALTO",
      "cnpj": "12345678000199",
      "ultima_venda_GoldVendas": "2026-04-08",
      "ultima_hora_venda_GoldVendas": "2026-04-08 18:30:00",
      "ultima_venda_SilverSTGN_Dedup": "2026-04-14",
      "ultima_hora_venda_SilverSTGN_Dedup": "18:55:10",
      "tipo_divergencia": "data_diferente",
      "camadas_atrasadas": ["GoldVendas", "API"],
      "camadas_sem_dados": null
    }
  ],
  "status_farmacias": [
    {
      "cod_farmacia": "30559",
      "coletor_novo": "Pendente de envio no dia 2026-04-10",
      "coletor_bi_ultima_data": "2026-04-10",
      "coletor_bi_ultima_hora": "18:30:00"
    },
    {
      "cod_farmacia": "24434",
      "coletor_novo": "OK, sem registro",
      "coletor_bi_ultima_data": "2026-04-20",
      "coletor_bi_ultima_hora": "09:10:00"
    }
  ]
}
```

**Campos de `divergencias[]`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cod_farmacia` | string | Código da farmácia |
| `nome_farmacia` | string \| null | Nome da farmácia |
| `cnpj` | string \| null | CNPJ somente com dígitos |
| `ultima_venda_GoldVendas` | string \| null | Última venda em `associacao.vendas` (YYYY-MM-DD) |
| `ultima_hora_venda_GoldVendas` | string \| null | Timestamp da última venda em `associacao.vendas` |
| `ultima_venda_SilverSTGN_Dedup` | string \| null | Última venda em `silver.cadcvend_staging_dedup` (YYYY-MM-DD) |
| `ultima_hora_venda_SilverSTGN_Dedup` | string \| null | Hora da última venda em `silver.cadcvend_staging_dedup` |
| `tipo_divergencia` | string | Tipo da divergência |
| `camadas_atrasadas` | string[] \| null | Camadas com atraso |
| `camadas_sem_dados` | string[] \| null | Camadas sem nenhum registro |

**Campos de `status_farmacias[]`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cod_farmacia` | string | Código da farmácia |
| `coletor_novo` | string | Status no Business Connect |
| `coletor_bi_ultima_data` | string \| null | Data da última venda no Coletor BI (YYYY-MM-DD) |
| `coletor_bi_ultima_hora` | string \| null | Hora da última venda no Coletor BI (HH:MM:SS) |

> Após o POST, chame `GET /historico` ou `GET /historico/{associacao}` para atualizar a tela.

**Erros:**

| Código | Descrição |
|--------|-----------|
| `422` | `associacao` não informado |
| `503` | Falha de conexão com o Redshift |

**Exemplo JS:**
```js
async function atualizarComparacao(associacao) {
  const res = await fetch('http://localhost:8000/comparar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ associacao }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}
```

---

### `GET /comparar` — Comparar via query param

Alternativa ao POST para chamadas diretas. Retorna a mesma estrutura de `POST /comparar`.

```
GET http://localhost:8000/comparar?associacao=80
```

---

### `GET /status-farmacias` — Status dos coletores por farmácia

Lê direto da tabela `status_farmacias` do banco local. Útil para verificar o status do Business Connect e Coletor BI sem disparar uma nova comparação.

**URL:**
```
GET http://localhost:8000/status-farmacias
GET http://localhost:8000/status-farmacias?limit=50
```

**Query params:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `limit` | int | 100 | Máximo de registros retornados |

**Resposta (200):**
```json
[
  {
    "id": 1,
    "comparacao_id": 3,
    "cod_farmacia": "30559",
    "coletor_novo": "Pendente de envio no dia 2026-04-10"
  },
  {
    "id": 2,
    "comparacao_id": 3,
    "cod_farmacia": "24434",
    "coletor_novo": "OK, sem registro"
  }
]
```

**Campos da resposta:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | int | ID do registro |
| `comparacao_id` | int | ID da comparação vinculada |
| `cod_farmacia` | string | Código da farmácia |
| `coletor_novo` | string \| null | Status no Business Connect |

**Valores de `coletor_novo`:** (mesmos do `/historico`)

| Valor | Significa |
|-------|-----------|
| `"OK, sem registro"` | Sem pendência |
| `"Pendente de envio no dia YYYY-MM-DD"` | Pendência registrada |
| `"Indisponível"` | Business Connect não respondeu |

**Erro:**

| Código | Descrição |
|--------|-----------|
| `503` | Erro ao acessar o banco local (inclui detalhe do erro) |

**Exemplo JS:**
```js
const res = await fetch('http://localhost:8000/status-farmacias?limit=200');
const status = await res.json();
```

---

### `GET /ultima-atualizacao` — Data da comparação mais recente

Retorna a data/hora da comparação mais recente entre **todas** as associações salvas no banco local.

**URL:**
```
GET http://localhost:8000/ultima-atualizacao
```

**Resposta (200):**
```json
{ "atualizado_em": "2026-04-21 10:00:00" }
```

> `atualizado_em` é `null` se nenhuma comparação foi executada ainda.

**Erro:**

| Código | Descrição |
|--------|-----------|
| `503` | Erro ao acessar o banco local |

---

### `GET /coletor/{codigo}` — Status do Coletor BI para uma farmácia

Consulta diretamente o Coletor BI para obter a data/hora da última venda registrada para um código de farmácia específico.

**URL:**
```
GET http://localhost:8000/coletor/30559
```

**Resposta (200):**
```json
{
  "data_hora_ultima_venda": {
    "farmacia": "30559",
    "ultima_data": "2026-04-20",
    "ultima_hora": "18:30:00"
  }
}
```

> Se o Coletor BI não tiver dados ou estiver indisponível, `ultima_data` e `ultima_hora` serão `null`.

**Erro:**

| Código | Descrição |
|--------|-----------|
| `503` | Falha de conexão com o Coletor BI |

---

## Outros endpoints

| Endpoint | Uso |
|----------|-----|
| `GET /` | Verifica se a API está no ar |
| `GET /health` | Status da API + conectividade com o Redshift |
| `GET /docs` | Swagger UI interativo (gerado automaticamente) |
| `GET /status-farmacias` | Status do Business Connect por farmácia (banco local) |

---

## CORS

A API já tem CORS habilitado (`Access-Control-Allow-Origin: *`).  
Chamadas diretas do browser funcionam sem configuração adicional.

Para restringir a origens específicas, ajuste `CORS_ORIGINS` no `.env`:
```
CORS_ORIGINS=http://localhost:3000,https://dashboard.suaempresa.com
```

