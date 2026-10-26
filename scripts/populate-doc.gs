function populateDocument() {
  var docId = '1VQZ1JyTbBsx8QaiWlZdrWuAxklSl9GK77E0g0QdppRM';
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();

  // Limpa o documento
  body.clear();

  // === ESTILOS ===
  var styleNormal = {};
  styleNormal[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto';
  styleNormal[DocumentApp.Attribute.FONT_SIZE] = 11;
  styleNormal[DocumentApp.Attribute.BOLD] = false;
  styleNormal[DocumentApp.Attribute.ITALIC] = false;
  styleNormal[DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';

  var styleH1 = {};
  styleH1[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto';
  styleH1[DocumentApp.Attribute.FONT_SIZE] = 18;
  styleH1[DocumentApp.Attribute.BOLD] = true;

  var styleH2 = {};
  styleH2[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto';
  styleH2[DocumentApp.Attribute.FONT_SIZE] = 16;
  styleH2[DocumentApp.Attribute.BOLD] = true;

  var styleH3 = {};
  styleH3[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto';
  styleH3[DocumentApp.Attribute.FONT_SIZE] = 13;
  styleH3[DocumentApp.Attribute.BOLD] = true;

  var styleBold = {};
  styleBold[DocumentApp.Attribute.BOLD] = true;

  var styleCode = {};
  styleCode[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto Mono';
  styleCode[DocumentApp.Attribute.FONT_SIZE] = 9;
  styleCode[DocumentApp.Attribute.BACKGROUND_COLOR] = '#f3f4f6';

  // === HELPER FUNCTIONS ===
  function addHeading1(text) {
    var p = body.appendParagraph(text);
    p.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    p.setAttributes(styleH1);
    return p;
  }

  function addHeading2(text) {
    var p = body.appendParagraph(text);
    p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    p.setAttributes(styleH2);
    return p;
  }

  function addHeading3(text) {
    var p = body.appendParagraph(text);
    p.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    p.setAttributes(styleH3);
    return p;
  }

  function addParagraph(text) {
    var p = body.appendParagraph(text);
    p.setAttributes(styleNormal);
    return p;
  }

  function addBoldParagraph(text) {
    var p = body.appendParagraph(text);
    p.setAttributes(styleNormal);
    p.setBold(true);
    return p;
  }

  function addBullet(text) {
    var item = body.appendListItem(text);
    item.setGlyphType(DocumentApp.GlyphType.BULLET);
    item.setAttributes(styleNormal);
    return item;
  }

  function addCodeBlock(lines) {
    for (var i = 0; i < lines.length; i++) {
      var p = body.appendParagraph(lines[i]);
      p.setAttributes(styleCode);
    }
  }

  function addTable(headers, rows) {
    var tableData = [headers].concat(rows);
    var table = body.appendTable(tableData);
    var headerRow = table.getRow(0);
    for (var c = 0; c < headerRow.getNumCells(); c++) {
      headerRow.getCell(c).getChild(0).asParagraph().setBold(true);
    }
    for (var r = 0; r < table.getNumRows(); r++) {
      for (var c2 = 0; c2 < table.getRow(r).getNumCells(); c2++) {
        var cell = table.getRow(r).getCell(c2);
        cell.getChild(0).asParagraph().setAttributes(styleNormal);
      }
    }
    return table;
  }

  function addSpacer() {
    addParagraph('');
  }

  function addHR() {
    body.appendHorizontalRule();
  }

  function addImageRef(caption) {
    var p = body.appendParagraph('[Imagem: ' + caption + ']');
    p.setAttributes(styleNormal);
    p.setItalic(true);
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    return p;
  }

  // ============================================================
  // CAPA
  // ============================================================
  addSpacer(); addSpacer(); addSpacer(); addSpacer();

  var p = body.appendParagraph('UNIFECAF');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  p = body.appendParagraph('GRADUAÇÃO EM IA E AUTOMAÇÃO DIGITAL');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  addSpacer(); addSpacer(); addSpacer();

  p = body.appendParagraph('ROBERT FERNANDO SCHWEPPE');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  addSpacer(); addSpacer(); addSpacer();

  p = body.appendParagraph('AI Operations: Automação Empresarial Inteligente com Low-Code e Agentes de IA');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true); p.setFontSize(14);

  addSpacer(); addSpacer(); addSpacer(); addSpacer(); addSpacer(); addSpacer();

  p = body.appendParagraph('Curitiba');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  p = body.appendParagraph('2026');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  body.appendPageBreak();

  // ============================================================
  // FOLHA DE ROSTO
  // ============================================================
  addSpacer(); addSpacer(); addSpacer();

  p = body.appendParagraph('ROBERT FERNANDO SCHWEPPE');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  addSpacer(); addSpacer();

  p = body.appendParagraph('AI Operations: Automação Empresarial Inteligente com Low-Code e Agentes de IA');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true); p.setFontSize(14);

  addSpacer(); addSpacer();

  p = body.appendParagraph('Trabalho apresentado à disciplina Desenvolvimento de Aplicações e Automações com Low Code, como requisito parcial de avaliação da disciplina.');
  p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  p.setAttributes(styleNormal);
  p.setIndentStart(200);

  addSpacer(); addSpacer(); addSpacer(); addSpacer(); addSpacer();

  p = body.appendParagraph('Curitiba');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  p = body.appendParagraph('2026');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setAttributes(styleNormal); p.setBold(true);

  body.appendPageBreak();

  // ============================================================
  // SUMÁRIO
  // ============================================================
  addHeading1('Sumário');
  addSpacer();
  addParagraph('1. Introdução');
  addParagraph('2. Problema Empresarial e Processo Escolhido');
  addParagraph('3. Processo Atual e Oportunidades de Automação');
  addParagraph('4. Arquitetura e Fluxo da Solução');
  addParagraph('    4.1 Meta-fluxo: Criador Automático de Fluxos via LLM');
  addParagraph('    4.2 Fluxo de negócio 1 — Aprovação de Férias');
  addParagraph('    4.3 Fluxo de negócio 2 — Triagem de Reclamações');
  addParagraph('5. Sistemas, Dados, APIs e Ferramentas Integradas');
  addParagraph('6. Função da Inteligência Artificial no Processo');
  addParagraph('7. Decisões Automatizadas e Pontos de Supervisão Humana');
  addParagraph('8. Riscos, Segurança, Privacidade e Tratamento de Falhas');
  addParagraph('9. Conclusão');
  addParagraph('Apêndice — Repositório, execução e credenciais');

  body.appendPageBreak();

  // ============================================================
  // 1. INTRODUÇÃO
  // ============================================================
  addHeading1('1. Introdução');
  addSpacer();
  addParagraph('Este trabalho descreve a concepção e a implementação de uma Automação Empresarial Inteligente construída sobre a plataforma Low-Code n8n, integrando agentes de IA (LLM) a sistemas corporativos reais. O foco, conforme o enunciado da disciplina, não está em reproduzir conceitos teóricos, mas em demonstrar as decisões de arquitetura e automação: o que automatizar, quando usar IA e quando manter uma pessoa no processo.');
  addSpacer();
  addParagraph('A entrega é composta por três camadas complementares. A primeira é um meta-fluxo gerador — o Criador Automático de Fluxos via LLM —, que recebe a descrição de uma automação em linguagem natural, pede a uma LLM que gere o JSON de um workflow n8n válido, valida e sanitiza essa saída contra um catálogo curado de nós, apresenta uma pré-visualização para revisão humana e, mediante aprovação, cria o workflow na instância via API. A segunda e a terceira camadas são dois processos empresariais reais gerados/estendidos a partir dessa base, que exercitam o ciclo completo exigido pelo enunciado — Entrada, Processamento, Dados, IA, Decisão, Ação, Supervisão e Registro:');
  addSpacer();
  addBullet('Aprovação de Férias (RH): formulário, consulta a uma planilha, regras de negócio determinísticas, IA redige a decisão, aprovação do gestor (Human-in-the-Loop), registro de volta na planilha e e-mail ao colaborador.');
  addBullet('Triagem de Reclamações (Atendimento/Operações): formulário, abertura de chamado no Trello, leitura dos chamados abertos como insumo, IA classifica e decide o encaminhamento, roteamento entre níveis de atendimento, e-mail ao cliente e comentário de rastreabilidade no card.');
  addSpacer();
  addParagraph('Toda a instância do n8n é versionada no próprio projeto (n8n 2.43.8 executado localmente), e todos os artefatos — catálogo, validador, Code nodes, workflows exportados e scripts utilitários — são mantidos como código reproduzível.');

  body.appendPageBreak();

  // ============================================================
  // 2. PROBLEMA EMPRESARIAL
  // ============================================================
  addHeading1('2. Problema Empresarial e Processo Escolhido');
  addSpacer();
  addParagraph('Uma empresa em crescimento acumula processos operacionais que atravessam vários sistemas e dependem de pessoas transferindo informações manualmente entre ferramentas: uma solicitação chega por formulário ou e-mail, alguém consulta uma base, aplica regras, decide, registra em outro sistema, encaminha ao responsável e acompanha até a conclusão. Esse padrão aumenta o tempo de execução, gera retrabalho, dificulta a rastreabilidade e limita a capacidade de a operação crescer.');
  addSpacer();
  addParagraph('Para demonstrar a solução em dois contextos empresariais distintos, foram escolhidos:');
  addSpacer();
  addBoldParagraph('1. Aprovação de férias (Recursos Humanos).');
  addParagraph('O colaborador solicita férias; a empresa precisa validar regras (antecedência mínima, período mínimo, saldo disponível, histórico), decidir, obter o aval do gestor e notificar. Hoje isso costuma depender de planilhas, e-mails e conferência manual, com risco de erro de cálculo e de resposta inconsistente.');
  addSpacer();
  addBoldParagraph('2. Triagem de reclamações de clientes (Atendimento/Operações).');
  addParagraph('O cliente registra uma reclamação; a empresa precisa abrir um chamado, verificar se o problema já é conhecido, decidir se resolve na hora, encaminha para atendimento humano ou associa a um bug já em desenvolvimento, e manter o cliente informado — sempre deixando rastro da resposta dada.');
  addSpacer();
  addParagraph('Ambos são processos reais, repetitivos e com decisões que podem ser significativamente melhoradas por IA e automação, mas que também exigem, em pelo menos um ponto, julgamento humano antes de uma ação relevante.');

  body.appendPageBreak();

  // ============================================================
  // 3. PROCESSO ATUAL E OPORTUNIDADES
  // ============================================================
  addHeading1('3. Processo Atual e Oportunidades de Automação');
  addSpacer();
  addTable(
    ['Processo', 'Como costuma funcionar hoje', 'Oportunidade de automação'],
    [
      ['Aprovação de férias', 'Colaborador manda e-mail; RH consulta planilha, calcula saldo e antecedência manualmente, responde; gestor aprova por e-mail; alguém anota o período concedido', 'Coletar via formulário, calcular regras automaticamente, deixar a IA redigir a resposta, pedir aprovação do gestor em uma tela e registrar a concessão sem digitação manual'],
      ['Triagem de reclamações', 'Cliente escreve; atendente lê, decide se responde, se escala ou se já é bug conhecido; respostas e status ficam dispersos', 'Abrir o chamado automaticamente, dar à IA o contexto dos chamados já abertos, classificar e rotear, responder por e-mail e registrar tudo no mesmo cartão'],
      ['Criação de novas automações', 'Um especialista monta cada fluxo manualmente na ferramenta, do zero', 'Um meta-fluxo descreve a automação em linguagem natural e gera o workflow com revisão humana antes de publicar']
    ]
  );
  addSpacer();
  addParagraph('A oportunidade central não é apenas trocar cliques por gatilhos, mas inserir decisão assistida por IA nos pontos em que hoje há julgamento repetitivo, preservando o controle humano onde a ação é crítica.');

  body.appendPageBreak();

  // ============================================================
  // 4. ARQUITETURA E FLUXO
  // ============================================================
  addHeading1('4. Arquitetura e Fluxo da Solução');
  addSpacer();
  addParagraph('A lógica-alvo do enunciado — Entrada, Processamento, Dados, IA, Decisão, Ação, Supervisão e Registro — está materializada nos dois fluxos de negócio. A seguir, a arquitetura de cada um.');
  addSpacer();

  addHeading2('4.1 Meta-fluxo: Criador Automático de Fluxos via LLM');
  addSpacer();
  addCodeBlock([
    'Formulário (descrição da automação em linguagem natural)',
    '   -> Monta prompt a partir de um catálogo curado de nós',
    '   -> LLM (OpenAI gpt-4o-mini) gera o JSON do workflow',
    '   -> Valida e sanitiza (tipos, versões, conexões, obrigatórios)',
    '   -> Pré-visualização em HTML para revisão humana (SUPERVISÃO)',
    '        - Aprovar  -> cria o workflow via API do n8n (não publicado)',
    '        - Ajustar  -> regenera com o feedback (loop, até 3 rodadas)',
    '        - Cancelar -> encerra'
  ]);
  addSpacer();

  addHeading2('4.2 Fluxo de negócio 1 — Aprovação de Férias');
  addSpacer();
  addCodeBlock([
    'Formulário de Férias (matrícula, início, fim, vender dias)      [ENTRADA]',
    '   -> Ler Colaboradores + Ler Férias (Google Sheets)            [DADOS]',
    '   -> Base (agrega as duas abas em um único item)               [PROCESSAMENTO]',
    '   -> Calcular Regras (Code determinístico)                     [PROCESSAMENTO]',
    '   -> Avaliar (LLM redige a decisão)                            [IA]',
    '   -> Decidir (If: aprovado?)                                   [DECISÃO]',
    '        [reprovado auto] -> E-mail de reprovação + Página erro',
    '        [aprovado] -> E-mail ao Gestor -> Página do Gestor      [SUPERVISÃO / HITL]',
    '              -> Decisão do Gestor (If)',
    '                   [Aprovar]  -> Registrar na planilha (Sheets) [AÇÃO/REGISTRO]',
    '                                 -> E-mail de conclusão',
    '                   [Reprovar] -> E-mail com o motivo do gestor'
  ]);
  addSpacer();

  addHeading2('4.3 Fluxo de negócio 2 — Triagem de Reclamações');
  addSpacer();
  addCodeBlock([
    'Formulário de Reclamação (nome, e-mail, assunto, descrição)    [ENTRADA]',
    '   -> Criar Card no Trello (lista N1 - Atendimento Chatbot)     [AÇÃO]',
    '   -> Ler Cards Abertos do quadro (N1/N2/N3)                    [DADOS/insumo]',
    '   -> Montar Contexto (reclamação + chamados abertos)           [PROCESSAMENTO]',
    '   -> Avaliar (LLM classifica e decide o encaminhamento)        [IA]',
    '   -> Ler Decisão (define a lista de destino)                   [DECISÃO]',
    '   -> Mover Card para a lista correta                           [AÇÃO]',
    '   -> Enviar E-mail ao Cliente (Gmail)                          [AÇÃO]',
    '   -> Comentar no Card com o conteúdo do e-mail enviado         [REGISTRO]'
  ]);
  addSpacer();
  addParagraph('Os três caminhos de decisão da triagem são: resolvido (a IA responde e o card vai para Concluído), humano (encaminha para N2 - Atendimento Humano com prazo de 48h) e em_andamento (quando a IA identifica, pelos chamados abertos, que o problema já está em tratamento — por exemplo em N3 - Desenvolvimento — e responde conforme o status atual).');

  body.appendPageBreak();

  // ============================================================
  // 5. SISTEMAS, DADOS, APIS
  // ============================================================
  addHeading1('5. Sistemas, Dados, APIs e Ferramentas Integradas');
  addSpacer();
  addTable(
    ['Integração', 'Nó / Protocolo', 'Autenticação', 'Função na automação'],
    [
      ['OpenAI (gpt-4o-mini)', 'Nó LangChain (lmChatOpenAi)', 'openAiApi', 'LLM que gera workflows, redige decisões e classifica reclamações'],
      ['API do n8n', 'REST /api/v1', 'X-N8N-API-KEY', 'Criar o workflow aprovado pelo Criador'],
      ['Google Sheets', 'Nó googleSheets', 'OAuth2', 'Ler a base de colaboradores/férias e gravar a concessão'],
      ['Gmail', 'Nó gmail', 'OAuth2', 'Envio real dos e-mails (colaborador, gestor, cliente)'],
      ['Trello', 'Nó trello + HTTP', 'API Key + Token', 'Criar, ler, mover e comentar cards do quadro'],
      ['n8n Form Trigger', 'Gatilho nativo', 'aberto / Basic Auth', 'Entrada dos três fluxos (substitui o Typeform)']
    ]
  );
  addSpacer();
  addParagraph('Dados movimentados. No fluxo de férias: planilha com as abas colaboradores (matrícula, nome, e-mail, gestor, e-mail do gestor, data de admissão, saldo de dias) e ferias (matrícula, início, fim, dias). No fluxo de reclamações: cards do Trello (nome do chamado, descrição, lista/status) e os dados do formulário do cliente.');
  addSpacer();
  addBoldParagraph('Nota sobre o Typeform:');
  addParagraph('O enunciado admite "ferramentas equivalentes". O coletor de reclamações foi previsto para o Typeform, mas como webhooks/integração via API do Typeform exigem plano pago, o gatilho foi implementado com o n8n Form Trigger, que cumpre a mesma função sem custo. Em produção, bastaria substituir o gatilho pelo Typeform Trigger, mantendo o restante do fluxo.');

  body.appendPageBreak();

  // ============================================================
  // 6. FUNÇÃO DA IA
  // ============================================================
  addHeading1('6. Função da Inteligência Artificial no Processo');
  addSpacer();
  addParagraph('A IA tem função concreta e delimitada em cada fluxo, nunca como enfeite:');
  addSpacer();
  addBullet('No Criador: a LLM gera o artefato técnico (o JSON do workflow) a partir de uma descrição em linguagem natural, com o escopo restrito pelo catálogo de nós permitidos.');
  addBullet('No fluxo de férias: a validação das regras é determinística (um nó Code calcula antecedência, período, saldo e histórico). A IA não faz contas — apenas redige a decisão a partir do resultado já calculado. LLMs erram aritmética, então o cálculo fica no código e a redação fica na IA.');
  addBullet('No fluxo de reclamações: a IA classifica e decide o encaminhamento. Recebe a reclamação e a lista de chamados abertos e devolve um JSON estruturado com a decisão (resolvido, humano ou em_andamento), a resposta ao cliente e o comentário de registro.');
  addSpacer();
  addParagraph('Em todos os casos, a saída da LLM é estruturada em JSON e lida por um nó determinístico, de modo que o fluxo nunca depende de texto livre para rotear ações.');

  body.appendPageBreak();

  // ============================================================
  // 7. DECISÕES E SUPERVISÃO
  // ============================================================
  addHeading1('7. Decisões Automatizadas e Pontos de Supervisão Humana');
  addSpacer();
  addBoldParagraph('Decisões delegadas à automação/IA:');
  addBullet('Cálculo das regras de férias e redação da resposta.');
  addBullet('Classificação da reclamação e escolha do caminho (resolver, escalar, associar a bug conhecido).');
  addBullet('Movimentação de cards, envio de e-mails e registro em planilha/comentário.');
  addSpacer();
  addBoldParagraph('Human-in-the-Loop (supervisão humana antes de ação crítica):');
  addBullet('Criador: nenhum workflow é criado sem a aprovação humana na tela de pré-visualização; e o workflow gerado é criado não publicado.');
  addBullet('Férias: a aprovação final é do gestor, numa página que mostra o resumo da solicitação (colaborador, período, saldo, avaliação da IA) e exige a escolha Aprovar/Reprovar. A concessão só é registrada na planilha após esse aval. Este é o ponto de HITL do processo.');
  addBullet('Reclamações: quando a IA decide humano, o chamado é encaminhado para a fila de atendimento humano (N2) com prazo de 48h — ou seja, a ação de "resolver" não é tomada pela IA quando o caso exige uma pessoa.');
  addSpacer();
  addParagraph('A regra de ouro aplicada foi: nem toda decisão deve ser da IA. Contas e ações irreversíveis ou sensíveis passam por validação determinística ou por uma pessoa.');

  body.appendPageBreak();

  // ============================================================
  // 8. RISCOS, SEGURANÇA, PRIVACIDADE, FALHAS
  // ============================================================
  addHeading1('8. Riscos, Segurança, Privacidade e Tratamento de Falhas');
  addSpacer();
  addBoldParagraph('Tratamento de falhas e resiliência:');
  addBullet('A saída da LLM é lida por um parser tolerante (aceita JSON puro ou entre cercas de código); se vier malformada no Criador, o validador devolve erros objetivos que alimentam uma nova tentativa (autocorreção, até 3 rodadas).');
  addBullet('O validador/sanitizador rejeita nós fora do catálogo, conexões para nós inexistentes, nomes duplicados e ausência de gatilho, e normaliza o workflow para o formato que a API aceita.');
  addBullet('Normalização de quebras de linha e de campos antes de enviar e-mails.');
  addBullet('Os fluxos tratam os caminhos de exceção explicitamente (reprovação automática, reprovação do gestor, limite de rodadas, caso impossível).');
  addSpacer();
  addBoldParagraph('Segurança e privacidade:');
  addBullet('Segredos nunca versionados: chaves (OpenAI, Google OAuth, Trello, API do n8n) ficam em scripts/.env e os IDs de credenciais em scripts/n8n/.credenciais.json, ambos no .gitignore. A documentação usa apenas placeholders.');
  addBullet('Dados da instância local (n8n/instancia/.n8n/, com banco e chave de criptografia) ficam fora do git.');
  addBullet('O catálogo curado limita os tipos de nó que a LLM pode gerar, reduzindo a superfície de risco.');
  addBullet('Workflows gerados pelo Criador nascem não publicados e só passam a valer após revisão.');
  addBullet('Rastreabilidade: no fluxo de reclamações, o conteúdo exato do e-mail enviado ao cliente é gravado como comentário no card do Trello, com o ID da mensagem.');
  addSpacer();
  addBoldParagraph('Riscos residuais assumidos (contexto acadêmico):');
  addParagraph('As credenciais usadas são de teste e serão revogadas após a entrega; o gatilho do Typeform foi substituído pelo Form do n8n por restrição de plano; e os formulários de demonstração ficam abertos na instância local.');

  body.appendPageBreak();

  // ============================================================
  // 9. CONCLUSÃO
  // ============================================================
  addHeading1('9. Conclusão');
  addSpacer();
  addParagraph('O projeto demonstra a evolução de uma automação convencional para uma operação inteligente: em vez de uma simples sequência gatilho-ação, há fluxos com múltiplas etapas, regras de negócio, integração entre vários sistemas (Google Sheets, Gmail, Trello, OpenAI, API do n8n) e decisão assistida por IA nos pontos certos. A separação entre o que é determinístico (cálculo de regras), o que é da IA (redigir e classificar) e o que é humano (aprovar) é a principal decisão de arquitetura — e é o que torna a solução confiável.');
  addSpacer();
  addParagraph('O diferencial de portfólio está no meta-fluxo Criador, que usa a IA para gerar as próprias automações com revisão humana, e na aplicação desse conceito a dois processos empresariais reais com Human-in-the-Loop, rastreabilidade e tratamento de falhas. O resultado é reproduzível: a instância do n8n e todos os artefatos estão versionados, e cada fluxo foi validado de ponta a ponta com evidências.');

  body.appendPageBreak();

  // ============================================================
  // APÊNDICE
  // ============================================================
  addHeading1('Apêndice — Repositório, execução e credenciais');
  addSpacer();
  addBoldParagraph('Repositório do projeto:');
  addParagraph('https://github.com/zastrich/graduacao-13-desenvolvimento-de-aplicacoes-e-automacoes-com-low-code');
  addSpacer();
  addBoldParagraph('Como executar (resumo):');
  addCodeBlock([
    '# instalar dependências da instância local do n8n (em scripts/)',
    'npm run n8n:install',
    '',
    '# subir a instância local (deixe rodando) - http://localhost:5678',
    'npm run n8n:start',
    '',
    '# importar os workflows e recriar as credenciais pelos nomes',
    'npm run n8n:import'
  ]);
  addSpacer();
  addBoldParagraph('Credenciais (apenas placeholders — nunca valores reais):');
  addCodeBlock([
    'OPENAI_API_KEY={{OPENAI_API_KEY}}',
    'N8N_API_KEY={{N8N_API_KEY}}',
    'GOOGLE_OAUTH_CLIENT_ID={{GOOGLE_OAUTH_CLIENT_ID}}',
    'GOOGLE_OAUTH_CLIENT_SECRET={{GOOGLE_OAUTH_CLIENT_SECRET}}',
    'TRELLO_API_KEY={{TRELLO_API_KEY}}',
    'TRELLO_TOKEN={{TRELLO_TOKEN}}'
  ]);
  addSpacer();
  addParagraph('Evidências (prints): disponíveis em assets/prints/ (canvas dos fluxos, formulários, planilha, quadro do Trello, cards com comentário e e-mails enviados).');
  addSpacer();
  addBoldParagraph('Vídeo pitch: (adicionar link do vídeo)');

  Logger.log('Documento populado com sucesso!');
}
