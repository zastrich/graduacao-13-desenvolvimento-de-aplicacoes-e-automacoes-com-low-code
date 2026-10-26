UniFECAF
GRADUACAO IA E AUTOMACAO DIGITAL

ROBERT FERNANDO SCHWEPPE

**Desenvolvimento de Aplicações e Automações com Low Code**

CURITIBA
2026

ROBERT FERNANDO SCHWEPPE

**AI Operations: Automação Empresarial Inteligente com Low-Code e Agentes de IA**

Trabalho apresentado à disciplina Desenvolvimento de Aplicações e Automações com Low Code, como requisito parcial de avaliação da disciplina.

CURITIBA
2026

# **Sumário**

[1. Introdução](#introducao)

[2. Problema Empresarial e Processo Escolhido](#problema-empresarial-e-processo-escolhido)

[3. Processo Atual e Oportunidades de Automação](#processo-atual-e-oportunidades-de-automacao)

[4. Arquitetura e Fluxo da Solução](#arquitetura-e-fluxo-da-solucao)

[5. Sistemas, Dados, APIs e Ferramentas Integradas](#sistemas-dados-apis-e-ferramentas-integradas)

[6. Função da Inteligência Artificial no Processo](#funcao-da-inteligencia-artificial-no-processo)

[7. Decisões Automatizadas e Pontos de Supervisão Humana](#decisoes-automatizadas-e-pontos-de-supervisao-humana)

[8. Riscos, Segurança, Privacidade e Tratamento de Falhas](#riscos-seguranca-privacidade-e-tratamento-de-falhas)

[9. Conclusão](#conclusao)

[Apêndice — Repositório, execução e credenciais](#apendice)

---

# **1. Introdução**

Este trabalho descreve a concepção e a implementação de uma **Automação Empresarial Inteligente** construída sobre a plataforma Low-Code **n8n**, integrando agentes de IA (LLM) a sistemas corporativos reais. O foco, conforme o enunciado da disciplina, não está em reproduzir conceitos teóricos, mas em **demonstrar as decisões de arquitetura e automação**: o que automatizar, quando usar IA e quando manter uma pessoa no processo.

A entrega é composta por três camadas complementares. A primeira é um **meta-fluxo gerador** — o *Criador Automático de Fluxos via LLM* —, que recebe a descrição de uma automação em linguagem natural, pede a uma LLM que gere o JSON de um workflow n8n válido, valida e sanitiza essa saída contra um catálogo curado de nós, apresenta uma pré-visualização para revisão humana e, mediante aprovação, cria o workflow na instância via API. A segunda e a terceira camadas são **dois processos empresariais reais** gerados/estendidos a partir dessa base, que exercitam o ciclo completo exigido pelo enunciado — **Entrada → Processamento → Dados → IA → Decisão → Ação → Supervisão → Registro**:

- **Aprovação de Férias** (RH): formulário → consulta a uma planilha → regras de negócio determinísticas → IA redige a decisão → aprovação do gestor (Human-in-the-Loop) → registro de volta na planilha → e-mail ao colaborador.
- **Triagem de Reclamações** (Atendimento/Operações): formulário → abertura de chamado no Trello → leitura dos chamados abertos como insumo → IA classifica e decide o encaminhamento → roteamento entre níveis de atendimento → e-mail ao cliente + comentário de rastreabilidade no card.

Toda a instância do n8n é versionada no próprio projeto (n8n 2.43.8 executado localmente), e todos os artefatos — catálogo, validador, Code nodes, workflows exportados e scripts utilitários — são mantidos como código reproduzível.

---

# **2. Problema Empresarial e Processo Escolhido**

Uma empresa em crescimento acumula processos operacionais que atravessam vários sistemas e dependem de pessoas transferindo informações manualmente entre ferramentas: uma solicitação chega por formulário ou e-mail, alguém consulta uma base, aplica regras, decide, registra em outro sistema, encaminha ao responsável e acompanha até a conclusão. Esse padrão aumenta o tempo de execução, gera retrabalho, dificulta a rastreabilidade e limita a capacidade de a operação crescer.

Para demonstrar a solução em dois contextos empresariais distintos, foram escolhidos:

1. **Aprovação de férias (Recursos Humanos).** O colaborador solicita férias; a empresa precisa validar regras (antecedência mínima, período mínimo, saldo disponível, histórico), decidir, obter o aval do gestor e notificar. Hoje isso costuma depender de planilhas, e-mails e conferência manual, com risco de erro de cálculo e de resposta inconsistente.

2. **Triagem de reclamações de clientes (Atendimento/Operações).** O cliente registra uma reclamação; a empresa precisa abrir um chamado, verificar se o problema já é conhecido, decidir se resolve na hora, encaminha para atendimento humano ou associa a um bug já em desenvolvimento, e manter o cliente informado — sempre deixando rastro da resposta dada.

Ambos são processos reais, repetitivos e com decisões que podem ser significativamente melhoradas por IA e automação, mas que também exigem, em pelo menos um ponto, julgamento humano antes de uma ação relevante.

---

# **3. Processo Atual e Oportunidades de Automação**

| Processo | Como costuma funcionar hoje | Oportunidade de automação |
|---|---|---|
| Aprovação de férias | Colaborador manda e-mail; RH consulta planilha, calcula saldo e antecedência "na mão", responde; gestor aprova por e-mail; alguém anota o período concedido | Coletar via formulário, calcular regras automaticamente, deixar a IA redigir a resposta, pedir aprovação do gestor em uma tela e registrar a concessão sem digitação manual |
| Triagem de reclamações | Cliente escreve; atendente lê, decide se responde, se escala para o time ou se já é um bug conhecido; respostas e status ficam dispersos | Abrir o chamado automaticamente, dar à IA o contexto dos chamados já abertos, classificar e rotear, responder por e-mail e registrar tudo no mesmo cartão |
| Criação de novas automações | Um especialista monta cada fluxo manualmente na ferramenta, do zero | Um meta-fluxo descreve a automação em linguagem natural e gera o workflow com revisão humana antes de publicar |

A oportunidade central não é apenas trocar cliques por gatilhos, mas inserir **decisão assistida por IA** nos pontos em que hoje há julgamento repetitivo, preservando o controle humano onde a ação é crítica.

---

# **4. Arquitetura e Fluxo da Solução**

A lógica-alvo do enunciado — *Entrada → Processamento → Dados → IA → Decisão → Ação → Supervisão → Registro* — está materializada nos dois fluxos de negócio. A seguir, a arquitetura de cada um.

## 4.1 Meta-fluxo: Criador Automático de Fluxos via LLM

```
Formulário (descrição da automação em linguagem natural)
   -> Monta prompt a partir de um catálogo curado de nós
   -> LLM (OpenAI gpt-4o-mini) gera o JSON do workflow
   -> Valida e sanitiza (tipos, versões, conexões, obrigatórios, nós órfãos)
   -> Pré-visualização em HTML para revisão humana (SUPERVISÃO)
        - Aprovar  -> cria o workflow via API do n8n (não publicado)
        - Ajustar  -> regenera com o feedback (loop, até 3 rodadas)
        - Cancelar -> encerra
```

## 4.2 Fluxo de negócio 1 — Aprovação de Férias

```
Formulário de Férias (matrícula, início, fim, vender dias)         [ENTRADA]
   -> Ler Colaboradores + Ler Férias (Google Sheets)               [DADOS]
   -> Base (agrega as duas abas em um único item)                  [PROCESSAMENTO]
   -> Calcular Regras (Code determinístico: antecedência,
      período, saldo, histórico)                                   [PROCESSAMENTO]
   -> Avaliar (LLM redige a decisão a partir do cálculo)           [IA]
   -> Decidir (If: aprovado?)                                      [DECISÃO]
        [reprovado automático] -> E-mail de reprovação + Página de erro
        [aprovado] -> E-mail ao Gestor -> Página de Aprovação do Gestor  [SUPERVISÃO / HITL]
              -> Decisão do Gestor (If)
                   [Aprovar]  -> Registrar Férias na planilha (Sheets) [AÇÃO/REGISTRO]
                                 -> E-mail de conclusão ao colaborador
                   [Reprovar] -> E-mail de reprovação com o motivo do gestor
```

## 4.3 Fluxo de negócio 2 — Triagem de Reclamações

```
Formulário de Reclamação (nome, e-mail, assunto, descrição)       [ENTRADA]
   -> Criar Card no Trello (lista N1 - Atendimento Chatbot)        [AÇÃO]
   -> Ler Cards Abertos do quadro (N1/N2/N3)                       [DADOS/insumo]
   -> Montar Contexto (reclamação + chamados abertos)              [PROCESSAMENTO]
   -> Avaliar (LLM classifica e decide o encaminhamento)           [IA]
   -> Ler Decisão (define a lista de destino)                      [DECISÃO]
   -> Mover Card para a lista correta                              [AÇÃO]
   -> Enviar E-mail ao Cliente (Gmail)                             [AÇÃO]
   -> Comentar no Card com o conteúdo do e-mail enviado            [REGISTRO/rastreabilidade]
```

Os três caminhos de decisão da triagem são: **resolvido** (a IA responde e o card vai para *Concluído*), **humano** (encaminha para *N2 - Atendimento Humano* com prazo de 48h) e **em_andamento** (quando a IA identifica, pelos chamados abertos, que o problema já está em tratamento — por exemplo em *N3 - Desenvolvimento* — e responde conforme o status atual).

---

# **5. Sistemas, Dados, APIs e Ferramentas Integradas**

| Integração | Protocolo / Nó | Autenticação | Função na automação |
|---|---|---|---|
| OpenAI (`gpt-4o-mini`) | Nó LangChain (`lmChatOpenAi`) | Credencial `openAiApi` | LLM que gera workflows, redige decisões de férias e classifica reclamações |
| API do n8n | REST `/api/v1` | `X-N8N-API-KEY` | Criar o workflow aprovado pelo Criador |
| Google Sheets | Nó `googleSheets` | OAuth2 | Ler a base de colaboradores/férias e gravar a concessão |
| Gmail | Nó `gmail` | OAuth2 | Envio real dos e-mails (colaborador, gestor, cliente) |
| Trello | Nó `trello` + HTTP | API Key + Token | Criar, ler, mover e comentar cards do quadro de atendimento |
| n8n Form Trigger | Gatilho nativo | — (aberto / Basic Auth opcional) | Entrada dos três fluxos (substitui o Typeform, ver nota abaixo) |

**Dados movimentados.** No fluxo de férias: planilha com as abas `colaboradores` (matrícula, nome, e-mail, gestor, e-mail do gestor, data de admissão, saldo de dias) e `ferias` (matrícula, início, fim, dias). No fluxo de reclamações: cards do Trello (nome do chamado, descrição, lista/status) e os dados do formulário do cliente.

**Nota sobre o Typeform.** O enunciado admite "ferramentas equivalentes". O coletor de reclamações foi previsto para o Typeform, mas como webhooks/integração via API do Typeform exigem plano pago, o gatilho foi implementado com o **n8n Form Trigger**, que cumpre a mesma função sem custo. Em produção, bastaria substituir o gatilho pelo Typeform Trigger, mantendo o restante do fluxo.

**Decisão de plataforma Low-Code.** Foi escolhido o **n8n** executado localmente em versão fixa (2.43.8), versionado no projeto, por permitir (a) construção visual dos fluxos, (b) nós nativos de IA (LangChain) e de serviços externos, e (c) acesso à API para automatizar a própria criação de workflows (o meta-fluxo).

---

# **6. Função da Inteligência Artificial no Processo**

A IA tem **função concreta e delimitada** em cada fluxo, nunca como enfeite:

- **No Criador:** a LLM **gera o artefato técnico** (o JSON do workflow) a partir de uma descrição em linguagem natural. É a IA produzindo automação, com o escopo restrito pelo catálogo de nós permitidos.
- **No fluxo de férias:** a validação das regras é **determinística** (um nó Code calcula antecedência, período, saldo e histórico). A IA **não faz contas** — ela apenas **redige** a decisão de forma clara e cordial a partir do resultado já calculado. Essa separação é uma decisão de arquitetura deliberada: LLMs erram aritmética, então o cálculo fica no código e a redação fica na IA.
- **No fluxo de reclamações:** a IA **classifica e decide o encaminhamento**. Ela recebe a reclamação e a lista de chamados já abertos e devolve um JSON estruturado com a decisão (`resolvido | humano | em_andamento`), a resposta ao cliente e o comentário de registro. Aqui a IA exerce julgamento (triagem), mas dentro de um conjunto fechado de caminhos possíveis.

Em todos os casos, a saída da LLM é **estruturada em JSON** e lida por um nó determinístico, de modo que o fluxo nunca depende de texto livre para rotear ações.

---

# **7. Decisões Automatizadas e Pontos de Supervisão Humana**

**Decisões delegadas à automação/IA:**
- Cálculo das regras de férias e redação da resposta.
- Classificação da reclamação e escolha do caminho (resolver, escalar, associar a bug conhecido).
- Movimentação de cards, envio de e-mails e registro em planilha/comentário.

**Human-in-the-Loop (supervisão humana obrigatória antes de ação crítica):**
- **Criador:** nenhum workflow é criado sem a **aprovação humana** na tela de pré-visualização; e o workflow gerado é criado **não publicado**.
- **Férias:** a aprovação final é do **gestor**, em uma página de formulário que mostra o resumo da solicitação (colaborador, período, saldo, avaliação da IA) e exige a escolha *Aprovar/Reprovar*. A concessão só é registrada na planilha após esse aval. Esse é o ponto de HITL do processo.
- **Reclamações:** quando a IA decide *humano*, o chamado é encaminhado para a fila de **atendimento humano** (N2) com prazo de 48h — ou seja, a ação de "resolver" não é tomada pela IA quando o caso exige uma pessoa.

A regra de ouro aplicada foi: **nem toda decisão deve ser da IA**. Contas e ações irreversíveis ou sensíveis (aprovar férias, resolver uma reclamação que exige tratamento humano) passam por validação determinística ou por uma pessoa.

---

# **8. Riscos, Segurança, Privacidade e Tratamento de Falhas**

**Tratamento de falhas e resiliência:**
- A saída da LLM é lida por um parser **tolerante** (aceita JSON puro ou entre cercas de código); se vier malformada no Criador, o validador devolve erros objetivos que alimentam uma nova tentativa (autocorreção, até 3 rodadas).
- O **validador/sanitizador** do Criador rejeita nós fora do catálogo, conexões para nós inexistentes, nomes duplicados e ausência de gatilho, e normaliza o workflow para o formato que a API aceita — impedindo que um JSON inválido quebre a instância.
- Normalização de quebras de linha e de campos antes de enviar e-mails, evitando conteúdo malformado.
- Os fluxos tratam os caminhos de exceção explicitamente (reprovação automática, reprovação do gestor, limite de rodadas do Criador, caso "impossível").

**Segurança e privacidade:**
- **Segredos nunca versionados:** chaves (OpenAI, Google OAuth, Trello, API do n8n) ficam em `scripts/.env`, e os IDs de credenciais em `scripts/n8n/.credenciais.json`, ambos no `.gitignore`. A documentação usa apenas placeholders.
- **Dados da instância local** (`n8n/instancia/.n8n/`, que contém o banco e a chave de criptografia) ficam fora do git.
- **Catálogo curado** limita os tipos de nó que a LLM pode gerar, reduzindo a superfície de risco de um workflow gerado automaticamente.
- Workflows gerados pelo Criador nascem **não publicados** e só passam a valer após revisão.
- **Rastreabilidade:** no fluxo de reclamações, o conteúdo exato do e-mail enviado ao cliente é gravado como comentário no card do Trello, com o ID da mensagem, garantindo auditoria da resposta.

**Riscos residuais assumidos (contexto acadêmico):** as credenciais usadas são de teste e serão revogadas após a entrega; o gatilho do Typeform foi substituído pelo Form do n8n por restrição de plano; e os formulários de demonstração ficam abertos na instância local.

---

# **9. Conclusão**

O projeto demonstra a evolução de uma automação convencional para uma **operação inteligente**: em vez de uma simples sequência gatilho-ação, há fluxos com múltiplas etapas, regras de negócio, integração entre vários sistemas (Google Sheets, Gmail, Trello, OpenAI, API do n8n) e **decisão assistida por IA** nos pontos certos. A separação entre o que é determinístico (cálculo de regras), o que é da IA (redigir e classificar) e o que é humano (aprovar) é a principal decisão de arquitetura — e é o que torna a solução confiável.

O diferencial de portfólio está no **meta-fluxo Criador**, que usa a IA para gerar as próprias automações com revisão humana, e na aplicação desse conceito a dois processos empresariais reais com Human-in-the-Loop, rastreabilidade e tratamento de falhas. O resultado é reproduzível: a instância do n8n e todos os artefatos estão versionados, e cada fluxo foi validado de ponta a ponta com evidências.

---

# **Apêndice — Repositório, execução e credenciais**

**Repositório do projeto:**
https://github.com/zastrich/graduacao-13-desenvolvimento-de-aplicacoes-e-automacoes-com-low-code

**Ferramentas e documentação:**
- n8n: https://docs.n8n.io/
- OpenAI API: https://platform.openai.com/docs
- Google Sheets / Gmail (Google APIs): https://developers.google.com/
- Trello REST API: https://developer.atlassian.com/cloud/trello/rest/

**Como executar (resumo):**
```bash
# instalar dependências da instância local do n8n
npm run n8n:install        # em scripts/

# subir a instância local (deixe rodando) — http://localhost:5678
npm run n8n:start          # em scripts/

# importar os workflows versionados e recriar as credenciais pelos nomes
npm run n8n:import         # em scripts/
```

**Credenciais necessárias (apenas placeholders — nunca valores reais):**
```
OPENAI_API_KEY={{OPENAI_API_KEY}}
N8N_API_KEY={{N8N_API_KEY}}
GOOGLE_OAUTH_CLIENT_ID={{GOOGLE_OAUTH_CLIENT_ID}}
GOOGLE_OAUTH_CLIENT_SECRET={{GOOGLE_OAUTH_CLIENT_SECRET}}
TRELLO_API_KEY={{TRELLO_API_KEY}}
TRELLO_TOKEN={{TRELLO_TOKEN}}
```

**Evidências (prints):** disponíveis em `assets/prints/` (canvas dos fluxos, formulários, planilha, quadro do Trello, cards com comentário e e-mails enviados).

**Vídeo pitch:** (adicionar link do vídeo)
