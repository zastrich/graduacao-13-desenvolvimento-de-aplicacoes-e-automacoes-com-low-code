# Roteiro do Vídeo Pitch — AI Operations: Automação Empresarial Inteligente com Low-Code

**Duração alvo:** ≤ 4 minutos
**Formato:** narração em voz + captura de tela (screencast)
**Autor:** Robert Fernando Schweppe — UniFECAF

Cada segmento traz o tempo cronometrado, a **narração falada** (o que dizer) e o **cue de tela** (o que mostrar). As telas correspondem aos screenshots em `assets/prints/`.

---

## (0:00 – 0:30) O problema e o processo original

**Narração:**
> "Em toda empresa que cresce, há processos que dependem de pessoas levando informação de uma ferramenta para outra: uma solicitação chega, alguém consulta uma base, aplica regras, decide, registra em outro sistema e avisa o responsável. Isso é lento, gera retrabalho e não deixa rastro. Eu peguei dois processos reais — aprovação de férias e triagem de reclamações — e os redesenhei com Low-Code, automação e IA no n8n."

**Cue de tela:** slide-título "AI Operations — Low-Code + Agentes de IA". Pode piscar rapidamente uma planilha e uma caixa de e-mail bagunçada representando o "antes".

---

## (0:30 – 1:15) A arquitetura: do gerador aos fluxos de negócio

**Narração:**
> "A base do projeto é um meta-fluxo: o Criador Automático de Fluxos. Você descreve a automação em linguagem natural, a IA gera o JSON do workflow, um validador confere tudo contra um catálogo de nós permitidos, e só depois da minha aprovação o fluxo é criado. A partir dessa base eu construí dois processos de verdade. Em ambos, a lógica é a mesma: entrada, processamento, dados, IA, decisão, ação, supervisão e registro. A regra que eu segui o tempo todo: nem toda decisão é da IA — conta é código, redação e classificação são da IA, e a aprovação crítica é humana."

**Cue de tela:** canvas do Criador (`assets/prints/02-criador-canvas.png`) e a tela de revisão/pré-visualização (`assets/prints/04-revisao-preview.png`).

---

## (1:15 – 2:10) Fluxo 1 — Aprovação de Férias (Google Sheets + Gmail + HITL)

**Narração:**
> "No primeiro fluxo, o colaborador pede férias por um formulário. O n8n lê a base no Google Sheets, um nó de código calcula as regras — antecedência, período, saldo — e a IA apenas redige a decisão, sem fazer conta. Se reprovar automaticamente, o colaborador já é avisado por e-mail com o motivo. Se passar, entra o ponto de supervisão humana: o gestor recebe o e-mail e aprova numa tela que mostra o resumo da solicitação. Só depois de aprovado o período é gravado de volta na planilha e o colaborador é notificado."

**Cue de tela:** canvas do fluxo de férias (`assets/prints/evidencia-canvas-ferias-final.png`); página de aprovação do gestor (`assets/prints/evidencia-pagina-gestor.png`); planilha (`assets/prints/evidencia-planilha-ferias.png`).

---

## (2:10 – 3:10) Fluxo 2 — Triagem de Reclamações (Trello + IA + Gmail)

**Narração:**
> "No segundo fluxo, o cliente registra uma reclamação. O n8n abre um card no Trello e — este é o ponto esperto — lê os chamados que já estão abertos no quadro para dar contexto à IA. A IA classifica: se é algo que ela resolve, responde e move o card para Concluído; se precisa de pessoa, encaminha para o atendimento humano com prazo de 48 horas; e se o problema já está em desenvolvimento, ela reconhece pelo quadro e responde conforme o status atual. Em todos os casos, o cliente recebe um e-mail e o conteúdo exato dessa resposta fica registrado como comentário no card, garantindo rastreabilidade."

**Cue de tela / SHOT-LIST (nesta ordem):**
1. Canvas do fluxo de reclamações — `assets/prints/evidencia-canvas-reclamacoes.png`
2. Formulário de reclamação — `assets/prints/evidencia-form-reclamacao.png`
3. Quadro do Trello com o roteamento (N1/N2/N3/Concluído) — `assets/prints/evidencia-trello-board.png`
4. Card com o comentário de tracking (conteúdo do e-mail) — `assets/prints/evidencia-trello-card-comentario.png`

---

## (3:10 – 4:00) Onde a IA atua, onde entra o humano, e os ganhos

**Narração:**
> "Resumindo: a IA tem função concreta em três pontos — gera automações, redige decisões e classifica demandas — sempre devolvendo um JSON estruturado que o fluxo usa para rotear. O humano entra onde a ação é crítica: aprovar um workflow antes de criar, aprovar as férias antes de registrar, e assumir a reclamação quando o caso exige uma pessoa. Os ganhos são tempo de execução menor, menos retrabalho, decisões consistentes e rastreabilidade de ponta a ponta. É uma operação inteligente, não uma sequência de gatilho e ação. Obrigado!"

**Cue de tela:** card com comentário de tracking e um e-mail enviado (`assets/prints/evidencia-email-gestor-no.png`); encerrar com slide de créditos e o link do repositório/vídeo — **(adicionar link do vídeo)**.

---

## Checklist de gravação

- [ ] Resolução mínima 1080p; esconder notificações e abas pessoais do navegador.
- [ ] Confirmar que o n8n está rodando e que todas as telas da SHOT-LIST estão carregadas antes de gravar.
- [ ] Nenhum segredo real visível em tela (tokens, chaves, e-mails privados). Usar apenas placeholders.
- [ ] Cronometrar cada bloco; manter o total ≤ 4:00.
- [ ] Áudio limpo (microfone, sem ruído de fundo).
- [ ] Deixar uma execução real pronta para mostrar o fluxo do início ao fim (entrada → registro).
- [ ] Preencher o placeholder do link do vídeo nos documentos ao publicar.

## Legendas sugeridas (lower-thirds)

- 0:00 — "O problema: processos manuais entre sistemas"
- 0:30 — "Arquitetura: meta-fluxo Criador + 2 processos reais"
- 1:15 — "Férias — Google Sheets + Gmail + aprovação do gestor (HITL)"
- 2:10 — "Reclamações — Trello + IA de triagem + rastreabilidade"
- 3:10 — "IA onde decide, humano onde é crítico — ganhos"
