<!--
Sync Impact Report
- Version change: N/A (template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Spec-First (Desenvolvimento Orientado a Especificação)
  - [PRINCIPLE_2_NAME] → II. Tipagem Estrita e Contratos Explícitos
  - [PRINCIPLE_3_NAME] → III. Testes Automatizados Rigorosos (INEGOCIÁVEL)
  - [PRINCIPLE_4_NAME] → IV. Arquitetura Modular e Separação de Responsabilidades
  - [PRINCIPLE_5_NAME] → V. Simplicidade, YAGNI e Observabilidade
- Added sections:
  - Restrições Tecnológicas e Padrões de Stack
  - Fluxo de Desenvolvimento e Quality Gates
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ compatível com Constitution Check)
  - .specify/templates/spec-template.md (✅ compatível com requisitos e cenários testáveis)
  - .specify/templates/tasks-template.md (✅ compatível com fases de testes unitários e integração)
- Follow-up TODOs: None
-->
# SDD (Spec-Driven Development) Constitution

## Core Principles

### I. Spec-First (Desenvolvimento Orientado a Especificação)

Nenhuma funcionalidade ou alteração arquitetural DEVE ser implementada sem uma especificação
(`spec.md`), um plano técnico (`plan.md`) e uma lista de tarefas (`tasks.md`) previamente
validados. Todo requisito funcional DEVE possuir critérios de aceitação claros, mensuráveis e
independentemente verificáveis antes do início da codificação.

**Racional**: Garantir alinhamento entre intenção de negócio e execução técnica, eliminando
retrabalho causado por requisitos ambíguos ou decisões implícitas.

### II. Tipagem Estrita e Contratos Explícitos

Todo código em TypeScript DEVE operar com verificação estrita ativa (`strict: true`), sendo
proibido o uso de `any` implícito ou explícito sem justificativa técnica documentada. Fronteiras
entre cliente, servidor, APIs e banco de dados DEVEM possuir esquemas de validação em tempo de
execução e contratos tipados compartilhados.

**Racional**: Prevenir falhas em tempo de execução, garantir segurança na refatoração fullstack e
manter documentação viva entre camadas de frontend e backend.

### III. Testes Automatizados Rigorosos (INEGOCIÁVEL)

Toda entrega de código DEVE incluir testes unitários para regras de negócio e utilitários, além
de testes de integração para rotas de API, fluxos críticos de interface e contratos de dados.
Nenhuma tarefa ou feature DEVE ser considerada concluída se houver falhas na suíte de testes,
erros de compilação (`typecheck`) ou violações de linter.

**Racional**: Assegurar confiabilidade contínua, permitir evolução segura do sistema e validar
objetivamente o cumprimento dos cenários definidos na especificação.

### IV. Arquitetura Modular e Separação de Responsabilidades

Componentes de interface (React/Next.js), lógica de domínio e camada de acesso a dados ou
serviços externos DEVEM ser estritamente desacoplados. Módulos DEVEM ter responsabilidade única,
interfaces públicas mínimas e não DEVEM introduzir dependências circulares.

**Racional**: Facilitar a testabilidade isolada de regras de negócio, promover reusabilidade e
manter a manutenibilidade à medida que a aplicação cresce.

### V. Simplicidade, YAGNI e Observabilidade

A implementação DEVE priorizar a solução mais simples que atenda integralmente aos requisitos da
especificação atual (princípio YAGNI — *You Aren't Gonna Need It*). Abstrações prematuras e
dependências externas desnecessárias DEVEM ser rejeitadas. Erros em operações críticas DEVEM ser
capturados com contexto estruturado e mensagens claras para diagnóstico.

**Racional**: Reduzir a complexidade cognitiva e o custo de manutenção, garantindo ao mesmo tempo
rastreabilidade rápida quando falhas ocorrerem.

## Restrições Tecnológicas e Padrões de Stack

- **Linguagem e Runtime**: TypeScript (modo `strict`) sobre Node.js LTS para ferramentas e
  backend, aplicando padrões modernos de ECMAScript.
- **Ecossistema Fullstack Web**: Aplicações web baseadas em React / Next.js (ou bibliotecas do
  ecossistema definidas no `plan.md` da feature), priorizando renderização eficiente,
  acessibilidade e componentização limpa.
- **Qualidade Estática**: Uso obrigatório de verificação de tipos (`tsc --noEmit`), linter e
  formatador padronizados no repositório.
- **Segurança e Configuração**: Segredos, chaves de API e credenciais NUNCA DEVEM ser versionados
  no código-fonte; variáveis de ambiente DEVEM ser validadas na inicialização da aplicação.

## Fluxo de Desenvolvimento e Quality Gates

1. **Especificação (`/speckit-specify` e `/speckit-clarify`)**: Definição de histórias de usuário
   priorizadas, casos de borda e critérios de sucesso agnósticos de implementação.
2. **Planejamento (`/speckit-plan`)**: Definição da arquitetura, contratos de dados e verificação
   explícita de conformidade com esta Constituição (*Constitution Check*).
3. **Decomposição (`/speckit-tasks` e `/speckit-analyze`)**: Quebra em tarefas atômicas e
   ordenadas por dependência, contemplando fases de testes e implementação.
4. **Quality Gates de Entrega (`/speckit-implement`)**:
   - Compilação TypeScript e linting com zero erros (`0 errors`).
   - Execução integral e aprovação dos testes unitários e de integração.
   - Validação de todos os cenários de aceitação previstos na `spec.md`.

## Governance

Esta Constituição é a fonte suprema de governança técnica do projeto SDD e prevalece sobre
práticas ad-hoc ou convenções não documentadas.

- **Procedimento de Emenda**: Qualquer alteração nos princípios ou restrições DEVE ser realizada
  no arquivo `.specify/memory/constitution.md`, acompanhada de justificativa técnica e revisão de
  impacto nos templates e artefatos ativos.
- **Política de Versionamento Semântico**:
  - `MAJOR`: Remoção ou redefinição incompatível de princípios fundamentais ou quality gates.
  - `MINOR`: Adição de novo princípio, nova seção de governança ou expansão material de regras.
  - `PATCH`: Refinamentos de redação, correções gramaticais ou esclarecimentos sem alteração de
    regra.
- **Verificação de Conformidade**: Todo plano de implementação (`plan.md`), lista de tarefas
  (`tasks.md`) e revisão de código DEVE validar explicitamente a aderência aos cinco princípios
  fundamentais desta Constituição. Exceções arquiteturais exigem justificativa documentada na
  tabela *Complexity Tracking* do plano da feature.

**Version**: 1.0.0 | **Ratified**: 2026-11-05 | **Last Amended**: 2026-11-05
