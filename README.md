# SDD RSS Feed Reader — Estudo Prático de Spec-Driven Development & Spec Kit

Este repositório é um **estudo prático sobre Spec-Driven Development (SDD)** utilizando o **[Spec Kit](https://github.com/github/spec-kit)** (`speckit`). O objetivo do projeto é demonstrar, ponta a ponta, como especificações estruturadas, contratos explícitos e *quality gates* governam a criação de uma aplicação real antes e durante a geração de código.

Como caso de estudo, foi construído um **Leitor de Feeds RSS 2.0 e Atom 1.0 Local-First**, onde todas as inscrições, artigos coletados e marcações de leitura (`lido` / `não lido`) persistem exclusivamente no dispositivo do usuário via **SQLite**.

---

## COMPASS — Como o Fluxo SDD (Spec Kit) foi Executado

No **Spec-Driven Development**, o código é consequência direta de artefatos de especificação e design previamente validados. O ciclo completo executado neste projeto seguiu as etapas abaixo:

| Etapa | Comando Spec Kit | Artefato Gerado | Papel no Fluxo SDD |
|-------|------------------|-----------------|--------------------|
| **1. Governança** | `/speckit.constitution` | `.specify/memory/constitution.md` | Define os 5 princípios inegociáveis do projeto (Spec-First, Tipagem Estrita, Testes Rigorosos, Arquitetura Modular e Simplicidade/YAGNI). |
| **2. Especificação** | `/speckit-specify` | `specs/001-rss-feed-reader/spec.md` | Traduz o pedido de negócio em *User Stories* priorizadas (`P1`, `P2`), casos de borda, requisitos funcionais (`FR-001` a `FR-012`) e critérios de sucesso mensuráveis (`SC-001` a `SC-004`). |
| **3. Planejamento Técnico** | `/speckit.plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md` | Toma decisões arquiteturais, modela o banco SQLite, define contratos Zod/HTTP e valida aderência à Constituição (*Constitution Check*). |
| **4. Decomposição em Tarefas** | `/speckit-tasks` | `specs/001-rss-feed-reader/tasks.md` | Quebra o plano em 39 tarefas atômicas (`T001`–`T039`) organizadas por fases e *User Stories*, permitindo entrega incremental e testes independentes. |
| **5. Implementação** | `/speckit-implement` | `src/**` e `tests/**` | Executa as tarefas seguindo TDD/contratos, cria os repositórios SQLite, serviços, rotas da API, interface React e valida todos os *Quality Gates*. |
| **6. Auditoria de Requisitos** | `/speckit-checklist` & `/speckit-analyze` | `checklists/requirements.md`, `checklists/rss-reader-quality.md` | Verifica a qualidade da escrita dos requisitos ("Unit Tests for English") e a consistência cruzada entre `spec.md`, `plan.md` e `tasks.md`. |

---

## O Que a Aplicação Faz

O **SDD RSS Feed Reader** é uma aplicação web local para leitura e acompanhamento de publicações via RSS e Atom:

- **Inscrição em Feeds por URL (`US1`)**:
  - Suporte aos padrões **RSS 2.0** e **Atom 1.0**.
  - Validação da URL (`http://` ou `https://`) e verificação da estrutura XML antes de salvar.
  - Prevenção automática de inscrições duplicadas (com normalização de URL).
  - Remoção de inscrições com exclusão em cascata (`ON DELETE CASCADE`) dos artigos vinculados.
- **Linha do Tempo Ordenada pelos Mais Recentes (`US2`)**:
  - Consolidação de todos os artigos em ordem cronológica inversa (`published_at DESC`, com *fallback* para a data de descoberta caso o item não informe data no XML).
  - Filtro rápido por **Todos os Artigos** ou por um **Feed específico** na barra lateral.
  - Leitura do conteúdo/resumo do artigo dentro da aplicação com **sanitização de HTML** contra XSS (`sanitize-html`) e botão para abrir a matéria original.
  - Atualização manual de feeds com tratamento resiliente (se uma fonte estiver fora do ar, as demais atualizam normalmente e a falha é exibida de forma não bloqueante).
- **Rastreamento de Lido / Não Lido com Persistência Local (`US3`)**:
  - Marcação automática como **Lido** ao abrir um artigo não lido.
  - Botão para alternar manualmente entre **Lido** e **Não lido** a qualquer momento.
  - Ação em lote **"✓ Marcar todos lidos"** (global ou apenas para o feed selecionado).
  - Filtro **"Apenas não lidos"** e contadores de artigos não lidos por feed e no total.
  - Preservação garantida do status de leitura mesmo quando o feed é atualizado novamente.
  - **100% Local-First**: Tudo fica salvo em um arquivo SQLite local no dispositivo (`./data/rss-reader.sqlite`), sem necessidade de login ou nuvem.

---

## Stack Tecnológica

- **Linguagem & Runtime**: TypeScript 5 (`strict: true`) em Node.js LTS
- **Framework Fullstack**: Next.js 15 (App Router) + React 19
- **Banco de Dados Local**: SQLite via `better-sqlite3` + `drizzle-orm` (modo WAL ativado)
- **Parsing de Feeds**: `rss-parser` (RSS 2.0 e Atom 1.0)
- **Segurança & Sanitização**: `sanitize-html` (remoção de `<script>`, `<iframe>`, `on*` e `javascript:`)
- **Validação em Tempo de Execução**: `zod` (variáveis de ambiente e entradas/contratos da API)
- **Testes & Qualidade**: `Vitest` (unitários e integração com SQLite `:memory:`), `tsc --noEmit` e `ESLint`

---

## Estrutura do Repositório

```text
├── .specify/
│   └── memory/
│       └── constitution.md           # Constituição e princípios de governança do projeto
├── specs/
│   └── 001-rss-feed-reader/          # Artefatos gerados pelo fluxo Spec Kit (SDD)
│       ├── spec.md                   # Especificação funcional e User Stories
│       ├── plan.md                   # Plano de implementação e arquitetura
│       ├── research.md               # Decisões técnicas (Phase 0)
│       ├── data-model.md             # Modelagem SQLite e transições de estado (Phase 1)
│       ├── quickstart.md             # Guia de validação ponta a ponta
│       ├── tasks.md                  # 39 tarefas rastreáveis (T001–T039)
│       ├── contracts/
│       │   └── api.md                # Contratos Zod e endpoints HTTP
│       └── checklists/
│           ├── requirements.md       # Checklist nativo da especificação
│           └── rss-reader-quality.md # Checklist de auditoria de requisitos
├── src/
│   ├── app/                          # Páginas Next.js (App Router) e Route Handlers (/api/*)
│   ├── components/                   # Componentes React (Sidebar, Form, Lista, Leitor)
│   ├── config/                       # Validação de variáveis de ambiente (env.ts)
│   ├── db/                           # Schema Drizzle, cliente SQLite e Repositórios
│   ├── schemas/                      # Contratos Zod compartilhados e DTOs
│   ├── services/                     # Parser RSS/Atom, Sanitizador HTML e Sincronização
│   └── lib/                          # Logger estruturado
└── tests/
    ├── unit/                         # Testes unitários (env, schemas, parser, sanitizer)
    └── integration/                  # Testes de integração (repositórios SQLite e rotas API)
```

---

## Como Executar o Projeto

### 1. Pré-requisitos
- **Node.js** (v20+ ou v22+ / v24+)
- **npm**

### 2. Instalação
No diretório raiz do projeto, instale as dependências:

```bash
npm install
```

### 3. Configuração de Ambiente (Opcional)
O projeto já possui padrões prontos para rodar localmente (`./data/rss-reader.sqlite`). Caso queira personalizar, copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Variáveis suportadas:
- `DATABASE_URL`: Caminho do arquivo SQLite local (padrão: `"./data/rss-reader.sqlite"`)
- `FEED_FETCH_TIMEOUT_MS`: Tempo limite em milissegundos ao buscar feeds externos (padrão: `"10000"`)

### 4. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

---

## URLs de Feeds para Testar a Aplicação

Copie qualquer uma das URLs abaixo e cole no campo **"Adicionar Feed"** na barra lateral:

- **TabNews (Recentes)**: `https://www.tabnews.com.br/recentes/rss`
- **G1 — Tecnologia**: `https://g1.globo.com/rss/g1/tecnologia/`
- **Tecnoblog**: `https://tecnoblog.net/feed/`
- **Hacker News (Newest)**: `https://hnrss.org/newest`
- **Node.js Blog**: `https://nodejs.org/en/feed/blog.xml`
- **The Verge (Atom)**: `https://www.theverge.com/rss/index.xml`

---

## Executando os Testes e Quality Gates

Para validar a tipagem estrita, o linter, a suíte de testes automatizados (22 testes unitários e de integração, incluindo benchmark de 1.000 artigos em `<200ms`) e o build de produção:

```bash
# Verificação de tipos TypeScript (strict: true)
npm run typecheck

# Análise estática ESLint
npm run lint

# Testes unitários e de integração com Vitest
npm run test

# Build de produção Next.js
npm run build
```
