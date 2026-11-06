# Feature Specification: RSS Feed Reader Local

**Feature Branch**: `001-rss-feed-reader`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Crie uma aplicação RSS Feed Reader que permita incrição no feeds por URL, visualização de artigos organizados por mais recentes primeiro, e tenha o track do status de  lido/não lido. Os dados precisa persistir somente no dispositivo"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inscrição e Gerenciamento de Feeds por URL (Priority: P1)

Como leitor, quero adicionar novas fontes de conteúdo informando a URL de um feed RSS/Atom e gerenciar minhas inscrições atuais para acompanhar minhas publicações favoritas em um único lugar.

**Why this priority**: Sem a capacidade de cadastrar e validar feeds por URL, o leitor não possui fontes de dados para exibir artigos, tornando esta a funcionalidade base do produto (MVP).

**Independent Test**: Pode ser testado de forma independente inserindo uma URL válida de feed, verificando que a fonte aparece na lista de inscrições com seu título original e que permanece salva após fechar e reabrir a aplicação no mesmo dispositivo.

**Acceptance Scenarios**:

1. **Given** que o usuário está na tela principal sem feeds cadastrados, **When** ele insere uma URL válida de feed RSS/Atom e confirma a inscrição, **Then** o sistema valida o feed, adiciona a inscrição à lista de fontes e carrega seus artigos.
2. **Given** que o usuário já está inscrito em uma URL de feed, **When** ele tenta cadastrar a mesma URL novamente, **Then** o sistema impede a duplicação e informa que o feed já está cadastrado.
3. **Given** que o usuário insere uma URL inválida, inacessível ou que não corresponde a um feed válido, **When** ele tenta confirmar a inscrição, **Then** o sistema exibe uma mensagem de erro clara explicando a falha sem corromper as inscrições existentes.
4. **Given** que o usuário possui feeds cadastrados, **When** ele opta por remover uma inscrição, **Then** o feed e seus artigos associados deixam de ser exibidos e a remoção persiste no dispositivo.

---

### User Story 2 - Visualização de Artigos Ordenados pelos Mais Recentes (Priority: P1)

Como leitor, quero visualizar os artigos das minhas inscrições em uma linha do tempo ordenada do mais recente para o mais antigo, podendo também filtrar por um feed específico ou atualizar os feeds, para consumir rapidamente as novidades.

**Why this priority**: O propósito central de um leitor de feeds é agregar e apresentar os artigos em ordem cronológica inversa (mais recentes primeiro). Junto à inscrição, compõe o núcleo essencial de valor ao usuário.

**Independent Test**: Pode ser testado cadastrando dois ou mais feeds com artigos de diferentes datas e verificando se a listagem consolida os itens exibindo sempre o artigo de data/hora de publicação mais recente no topo.

**Acceptance Scenarios**:

1. **Given** que o usuário possui um ou mais feeds cadastrados, **When** ele visualiza a lista de artigos ("Todos os Artigos"), **Then** os artigos de todas as fontes são exibidos em ordem decrescente pela data de publicação (mais recentes primeiro), apresentando título, nome da fonte e data de publicação.
2. **Given** que o usuário seleciona um feed específico na lista de inscrições, **When** a visualização é atualizada, **Then** apenas os artigos pertencentes àquele feed são exibidos, mantendo a ordenação dos mais recentes primeiro.
3. **Given** que o usuário clica em um artigo da lista, **When** o artigo é aberto, **Then** o sistema exibe o resumo ou conteúdo disponível do artigo e disponibiliza um link direto para abrir a publicação original no site de origem.
4. **Given** que o usuário deseja verificar novas publicações, **When** ele aciona a opção de atualizar feeds, **Then** o sistema busca novos artigos nas fontes inscritas e os insere na posição cronológica correspondente.

---

### User Story 3 - Rastreamento do Status de Lido e Não Lido com Persistência no Dispositivo (Priority: P2)

Como leitor, quero saber claramente quais artigos já foram lidos e quais ainda não foram lidos, podendo alternar esse status manualmente ou automaticamente ao abrir um artigo, com todas as informações salvas exclusivamente no meu dispositivo.

**Why this priority**: O controle de leitura evita que o usuário perca tempo relendo artigos antigos e garante continuidade entre sessões de uso sem exigir criação de conta ou servidor externo.

**Independent Test**: Pode ser testado marcando artigos como lidos/não lidos, aplicando filtro de "Não lidos", recarregando ou reabrindo a aplicação no dispositivo e confirmando que o estado exato de cada artigo foi preservado.

**Acceptance Scenarios**:

1. **Given** uma lista de artigos carregados, **When** o usuário observa os itens, **Then** artigos não lidos possuem distinção visual clara em relação aos artigos já lidos, e cada feed exibe a contagem de artigos não lidos.
2. **Given** um artigo com status "não lido", **When** o usuário abre o artigo para leitura, **Then** o artigo passa automaticamente para o status "lido" e o contador de não lidos é atualizado.
3. **Given** qualquer artigo na lista ou aberto, **When** o usuário aciona a opção de alternar status ("Marcar como lido" ou "Marcar como não lido"), **Then** o status do artigo é atualizado imediatamente.
4. **Given** que o usuário realizou inscrições e alterou o status de leitura de múltiplos artigos, **When** ele fecha a aplicação e a reabre posteriormente no mesmo dispositivo, **Then** todas as inscrições e os respectivos status de lido/não lido permanecem exatamente como deixados.
5. **Given** que o usuário deseja focar apenas em conteúdo novo, **When** ele ativa o filtro "Apenas não lidos", **Then** a lista exibe somente artigos com status "não lido", ordenados pelos mais recentes primeiro.

---

### Edge Cases

- **Artigos sem data de publicação no feed**: Quando um item do feed não informar data de publicação, o sistema deve utilizar a data/hora em que o artigo foi descoberto pelo leitor como referência para a ordenação cronológica.
- **Falha de conexão ou fonte temporariamente fora do ar durante atualização**: Se um dos feeds falhar ao atualizar, o sistema deve manter os artigos já salvos localmente, atualizar normalmente os demais feeds funcionais e indicar de forma não bloqueante qual fonte falhou.
- **Atualização de feed com artigos já lidos**: Ao buscar atualizações de um feed, artigos já conhecidos pelo dispositivo nunca devem ter seu status de "lido" sobrescrito para "não lido".
- **Conteúdo do artigo com formatação potencialmente insegura**: O conteúdo ou resumo vindo de feeds externos deve ser exibido de forma segura (sanitizada), impedindo que scripts ou elementos maliciosos afetem o dispositivo do usuário.
- **Limpeza de dados do dispositivo**: Caso o armazenamento local do dispositivo esteja vazio no primeiro acesso, o sistema deve exibir um estado inicial amigável orientando o usuário a adicionar seu primeiro feed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que o usuário adicione uma nova inscrição de feed informando sua URL (compatível com os formatos padrão RSS 2.0 e Atom 1.0).
- **FR-002**: O sistema DEVE validar se a URL informada é válida e se retorna um feed estruturado antes de salvar a inscrição, exibindo mensagem de erro compreensível em caso de falha.
- **FR-003**: O sistema DEVE impedir o cadastro duplicado de uma mesma URL de feed já inscrita no dispositivo.
- **FR-004**: O sistema DEVE permitir que o usuário visualize a lista de feeds inscritos (com título do feed e contagem de itens não lidos) e remova qualquer inscrição quando desejar.
- **FR-005**: O sistema DEVE apresentar a lista de artigos ordenada cronologicamente do mais recente para o mais antigo com base na data de publicação (ou data de coleta, caso a data de publicação esteja ausente).
- **FR-006**: O sistema DEVE permitir filtrar a visualização de artigos por "Todos os feeds" ou por um feed específico selecionado pelo usuário, bem como filtrar entre "Todos" e "Apenas não lidos".
- **FR-007**: O sistema DEVE exibir para cada artigo na listagem ao menos o título, o nome do feed de origem, a data/hora de publicação e o indicador visual de status (lido/não lido).
- **FR-008**: O sistema DEVE permitir a leitura do resumo ou conteúdo do artigo dentro da própria aplicação (com sanitização de conteúdo externo) e fornecer link direto para o artigo original no navegador.
- **FR-009**: O sistema DEVE marcar automaticamente um artigo como "lido" quando o usuário abri-lo para leitura, além de permitir alternar manualmente o status entre "lido" e "não lido" a qualquer momento.
- **FR-010**: O sistema DEVE permitir marcar todos os artigos da visualização atual como "lidos" em uma única ação.
- **FR-011**: O sistema DEVE permitir atualizar manualmente os feeds inscritos para buscar novos artigos publicados sem perder o histórico de status de leitura dos artigos já existentes.
- **FR-012**: O sistema DEVE persistir todas as inscrições de feeds, os artigos coletados e os status de lido/não lido exclusivamente no armazenamento local do dispositivo do usuário, sem depender de contas de usuário ou bancos de dados remotos para salvar o estado do leitor.

### Key Entities *(include if feature involves data)*

- **Inscrição de Feed (Feed Subscription)**: Representa uma fonte de conteúdo cadastrada pelo usuário. Atributos principais: identificador único, URL do feed, título da publicação, descrição opcional, link do site de origem, data da última sincronização e status da última atualização.
- **Artigo (Feed Item / Article)**: Representa uma publicação individual vinculada a um feed. Atributos principais: identificador único (baseado no identificador original do item ou link), referência ao feed de origem, título, resumo/conteúdo, autor opcional, URL original da matéria, data de publicação e indicador de status de leitura (`lido` ou `não lido`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário consegue se inscrever em um novo feed por URL e visualizar seus artigos listados em menos de 10 segundos (considerando tempo normal de resposta da fonte externa).
- **SC-002**: 100% dos artigos com data de publicação válida são apresentados estritamente do mais recente para o mais antigo tanto na visão geral quanto na visão por feed.
- **SC-003**: 100% das inscrições cadastradas e das marcações de lido/não lido permanecem íntegras no dispositivo após fechar e reabrir a aplicação ou recarregar a página.
- **SC-004**: A alternância do status de lido/não lido e a filtragem de artigos ocorrem de forma instantânea para o usuário (resposta visual em menos de 200ms) para coleções de até 1.000 artigos armazenados no dispositivo.

## Assumptions

- **Formatos de Feed Suportados**: Assume-se suporte aos formatos padrão de mercado RSS 2.0 e Atom 1.0.
- **Uso Pessoal e Local-First**: Não haverá tela de login, autenticação ou sincronização entre múltiplos dispositivos; todos os dados do usuário residem no próprio dispositivo.
- **Busca de Feeds Externos**: Como diversas fontes públicas de RSS não permitem leitura direta restrita por políticas de origem de navegadores, assume-se que a aplicação poderá utilizar um mecanismo intermediário sem estado (stateless) apenas para buscar o XML público quando necessário, garantindo que toda a persistência de inscrições e status de leitura ocorra estritamente no dispositivo.
- **Escopo Inicial**: Organização por pastas/categorias aninhadas, importação/exportação de arquivos OPML e busca textual avançada não fazem parte do escopo obrigatório inicial (v1), mantendo o foco nas operações centrais solicitadas.
