# RELATÓRIO TÉCNICO - PROJETO TCIP

---

## BACKEND (Django REST Framework)

### 1. MODELOS

#### LoteIncineracao

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | AutoField | PK automático |
| numero | IntegerField | Número sequencial global |
| ano | IntegerField | Ano de criação |
| protocolo | CharField(100) | Unique - Formato: 1CART6BPM-000001.2026 |
| origem | CharField(50) | Default: 1ºCART6BPM |
| data_criacao | DateTime | Auto_now_add |

#### Apreensao

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | AutoField | PK automático |
| processo | CharField(100) | Número do processo |
| bou | CharField(100) | BOU (Boletim de Ocorrência) |
| reu | CharField(200) | Nome do flagranteado |
| substancia | CharField(100) | Tipo de droga |
| peso | FloatField | Peso da apreensão |
| unidade | CharField(50) | Unidade (g, kg, mg) |
| lacre | CharField(100) | Número do lacre |
| policial | CharField(200) | Nome do policial |
| vara | CharField(200) | Vara judicial |
| descricao | TextField | Descrição adicional |
| status | CharField(50) | status (index) - Valores: conferencia, custodia, incineracao, queima_pronta |
| autorizacao | TextField | Autorização judicial |
| observacao_cofre | TextField | Observações |
| arquivo_pdf | FileField | Upload do laudo (opcional) |
| arquivo_pdf_url | URLField | URL do PDF |
| lote_incineracao | ForeignKey | FK para LoteIncineracao |
| data_criacao | DateTime | Auto_now_add (index) |

#### Historico

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | AutoField | PK automático |
| apreensao | ForeignKey | FK para Apreensao |
| acao | CharField(200) | Descrição da ação |
| data | DateTime | Auto_now_add (index) |

---

### 2. RELACIONAMENTOS

```
LoteIncineracao (1) ──────< (N) Apreensao
    │
    └─ related_name: "apreensoes"

Apreensao (1) ──────< (N) Historico
    │
    └─ related_name: "historico"
```

---

### 3. VIEWSETS

#### LoteIncineracaoViewSet

- queryset: LoteIncineracao.objects.all().order_by("-data_criacao")
- Filtros: ano, protocolo, data_inicio, data_fim
- Busca: protocolo, origem
- Ordenação: numero, ano, data_criacao

#### ApreensaoViewSet

- queryset: Apreensao.objects.select_related("lote_incineracao").prefetch_related("historico")
- Filtros: status, substancia, reu, bou, processo, data_inicio, data_fim
- Busca: processo, bou, reu, substancia, vara, policial
- Ordenação: data_criacao, peso, status
- Ação customizada: destinar_incineracao (POST)

---

### 4. ENDPOINTS API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | /api/apreensoes/ | Listar/Criar apreensões |
| GET/PUT/PATCH/DELETE | /api/apreensoes/{id}/ | Detalhar/Atualizar/Deletar |
| POST | /api/apreensoes/{id}/destinar_incineracao/ | Destinar para incineração |
| GET/POST | /api/lotes/ | Listar/Criar lotes |
| GET/PUT/PATCH/DELETE | /api/lotes/{id}/ | Detalhar/Atualizar/Deletar |
| POST | /api/token/ | Obter token JWT |
| POST | /api/token/refresh/ | Atualizar token |
| GET | /swagger/ | Documentação Swagger UI |
| GET | /redoc/ | Documentação Redoc |
| GET | /swagger/json/ | OpenAPI JSON |

**Parâmetros de paginação/filtragem:**

```
?page=1
?page_size=20
?status=incineracao
?search=maconha
?ordering=-data_criacao
```

---

### 5. SERIALIZERS

- ApreensaoSerializer: Inclui historico e lote_incineracao_detalhe
- LoteIncineracaoSerializer: Todos os campos
- HistoricoSerializer: Todos os campos

---

## FRONTEND (React + Vite)

### 1. ESTRUTURA DE PÁGINAS

| View | Chave | Descrição |
|------|-------|-----------|
| DashboardView | dashboard | Gráficos e estatísticas |
| CadastroView | cadastro | Formulário de nova apreensão |
| ConferenciaView | conferencia | Verificação de pesagem |
| CofreView | deposito | Itens no cofre |
| ProntoQueimaView | incineracao | Lotes prontos para incineração |
| HistoricoView | historico | Log de alterações |
| LoginView | - | Tela de login |

---

### 2. TELA "PRONTO PARA INCINERAÇÃO"

**Arquivo**: src/components/ProntoQueimaView.jsx

**Fluxo de dados:**

1. getApreensoes() → busca todas apreensões
2. getLotes() → busca todos lotes
3. Filtra: apreensoes.filter(a => a.status === "incineracao")
4. Agrupa por lote_incineracao.id

**Endpoints usados:**

- GET /api/apreensoes/ (com paginação - tratar .results)
- GET /api/lotes/ (com paginação - tratar .results)

**Funcionalidades:**

- Lista lotes com até 20 itens
- Gera PDF de certidão com jsPDF
- Exibe: BOU, processo, noticiado, substância, peso

---

### 3. CHAMADAS DE API (services/api.js)

```javascript
getApreensoes()     // GET /api/apreensoes/
addApreensao(data)  // POST /api/apreensoes/
updateApreensao(id, data)  // PATCH /api/apreensoes/{id}/
getLotes()          // GET /api/lotes/
destinarIncineracao(id)  // POST /api/apreensoes/{id}/destinar_incineracao/
```

**Tratamento de paginação:**

```javascript
const data = await res.json();
return data.results || data;  // Frontend espera array ou .results
```

---

## PONTOS DE ATENÇÃO PARA NOVAS FUNCIONALIDADES

1. Status válidos: conferencia, custodia, incineracao, queima_pronta
2. Limite por lote: 20 apreensões
3. PDF obrigatório: Para status incineracao, exige arquivo_pdf
4. Lote automático: Criado via action destinar_incineracao
5. Campos FK: Sempre usar select_related para otimizar queries
6. Paginação: API retorna {count, next, previous, results}

---

## HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-03-25 | 1.0.0 | Versão inicial do relatório |
| 2026-03-25 | 1.1.0 | Adicionado paginação e filtros |
| 2026-03-25 | 1.2.0 | Adicionado Swagger e CI/CD |
| 2026-03-28 | 1.3.0 | Padronização de constantes no Cadastro e fallback para SQLite |
