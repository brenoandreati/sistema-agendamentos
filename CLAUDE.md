# Arvan Agendamentos: contexto para o Claude

Agenda online + financeiro para negócios com hora marcada (barbearia, salão, nail designer, estética).
O dono do projeto é o Breno. Fale com ele em português simples, sem termos técnicos desnecessários.
O README.md explica o que o sistema faz e como publicar; leia antes de mudar algo grande.

## Regras com o Breno
- Nunca peça para colar token, senha ou chave no chat. Credenciais ficam nas configurações do ambiente.
- Não mexa nos outros Workers da conta Cloudflare (agenda-arvan, av-editor, dibiju, doceeamor,
  hte-heat-exchange, misty-bread-36ff, painel-tv, site-breno).
- Não rode comandos destrutivos no banco (migrate reset, apagar tabelas/dados) sem ele pedir.
  Dados de negócios reais (ex.: studio-joelma-santos) só mudam com confirmação dele.
- Não abra PR sem ele pedir. A branch de trabalho é `claude/optimistic-archimedes-ah99sc` (é a padrão do repositório).
- Mensagens de commit em português, com as linhas de coautoria que o sistema pedir.

## Produção
- Cloudflare Worker `arvan-agendamentos`: https://arvan-agendamentos.brenoandreati.workers.dev
  - Conta (account id): c7692f549ea764de8cb3822715354691
  - Segredos já configurados: DATABASE_URL, AUTH_SECRET, APP_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, ADMIN_EMAILS,
    SUPPORT_WHATSAPP (27999715520).
  - Publicar (o token vem da variável de ambiente CLOUDFLARE_API_TOKEN da sessão):
    `CLOUDFLARE_ACCOUNT_ID=c7692f549ea764de8cb3822715354691 npx opennextjs-cloudflare build && CLOUDFLARE_ACCOUNT_ID=c7692f549ea764de8cb3822715354691 npx opennextjs-cloudflare deploy`
  - Pacote atual ~2,45 MB gzip (limite do plano grátis: 3 MB). Plano grátis limita CPU; recomendado o pago (US$ 5).
  - Logs: observability ligado (API `workers/observability/telemetry/query`). Esta sessão não acessa *.workers.dev.
- Banco: Neon, projeto `rough-dream-55674160`, banco `arvan`, região sa-east-1 (São Paulo).
  - Migrações são aplicadas pelo Neon MCP (`run_sql_transaction`) com o SQL de `prisma/migrations/<nome>/migration.sql`
    + um INSERT em `_prisma_migrations` (id uuid, checksum = sha256 do arquivo, migration_name, applied_steps_count 1).
  - Já aplicadas: init, tipo_de_negocio_e_conta_de_cliente, demonstracao, piloto, equipe_lembretes_despesas.

## Rodar e testar aqui
- Postgres local: `service postgresql start` (para sozinho às vezes). Banco `arvan_dev`, usuário/senha `barber`.
  `.env` e `.dev.vars` são locais (não vão para o git); se não existirem, copie dos `.example` e gere VAPID com `npm run vapid`.
- `npm run typecheck`, `npm run lint`, `npm test` (node:test + tsx).
- Next: `npm run build && npm start` (porta 3000). Cloudflare local: `npx opennextjs-cloudflare build && npx opennextjs-cloudflare preview` (porta 8787).
- Playwright global: `require("/opt/node22/lib/node_modules/playwright")` com `executablePath: "/opt/pw-browsers/chromium"`.
- Para matar servidores sem matar o próprio shell: `pgrep -f "[w]orkerd serve|[w]rangler dev"` e `pkill -f "^next-server"`.
- `prisma migrate reset` é bloqueado de propósito; para banco limpo, crie outro banco local.

## Como o sistema funciona (decisões importantes)
- Prisma com `omit` global de `Shop.logoUrl`: a logo só é lida pela rota `/api/logo/[shopId]`. Use o tipo `ShopRow`.
- Sem Mercado Pago conectado, negócio real não cobra online (cliente paga no local). Pagamento simulado só em `isDemo`.
- `approvePayment` confere conflito de horário; pagamento atrasado sem horário vai para "Precisa de atenção" no painel.
- Sessões com `sessionVersion` (trocar senha desconecta outros aparelhos). Limite de tentativas na tabela `RateLimit`.
- Avisos no celular: Web Push próprio em `src/lib/web-push.ts` (testado contra a biblioteca http_ece), envio com `after()`.
- /admin só para e-mails em ADMIN_EMAILS (conta de negócio com esse e-mail). Senha esquecida = link de uso único gerado no /admin.
- Demonstração em /demonstracao: um negócio por área, dados refeitos a cada 12 h, configurações e catálogo travados.
  Tem despesas fictícias (aluguel e internet como fixas) e não deixa criar login de profissional.
- Login de profissional (`Role.STAFF`, `User.professionalId`): o dono cria em Profissionais → editar → "Acesso ao painel"
  (link de uso único para criar a senha). Telas/ações só do dono usam `requireOwner()`; as compartilhadas (início, agenda,
  agendamento, bloqueio, lembretes) filtram com `agendaScope(user)`. Profissional não vê dinheiro do negócio nem apaga pagamento.
  Avisos no celular vão para o dono + o profissional do agendamento.
- Lembretes (/painel/lembretes): lista com botão de WhatsApp (wa.me, sem API paga), marca `Appointment.reminderSentAt`
  (volta a vazio quando o horário muda). A mensagem leva o link do agendamento quando o cliente pode cancelar/remarcar.
- Remarcar pelo cliente: mesmo prazo de `cancelNoticeMin`, só CONFIRMED, mesmo profissional e mesma duração
  (`customerReschedulePolicy`). Pagamento continua ligado ao agendamento.
- Despesas: `Expense` + `RecurringExpense` (fixas). `syncRecurringExpenses` lança os meses que chegaram ao abrir o
  financeiro/planilha (conditional update em `nextDate` evita lançar em dobro). Lucro = recebido − despesas.

## Pendências (out/2026)
1. Conferir se o /admin abre com a conta do Breno (a conta existe, negócio "arvan"; o e-mail precisa estar em ADMIN_EMAILS).
2. ~~WhatsApp do suporte~~ feito (out/2026).
3. Testar no celular: ligar avisos e Pix real de R$ 1 com Mercado Pago conectado.
4. Decidir domínio próprio antes de divulgar links; depois trocar APP_URL.
5. Ativar plano pago do Cloudflare durante o piloto.
6. ~~Pagamentos "demo" antigos do studio-joelma-santos~~ apagados com autorização do Breno (out/2026).
7. Termos e privacidade são texto base: recomendar revisão por advogado antes de cobrar.
8. Feito (out/2026): lista de lembretes (o Breno escolheu a versão grátis, sem envio automático), login por profissional,
   remarcar pelo cliente, despesas/lucro. Se um dia quiser lembrete automático: WhatsApp oficial da Meta (pago por mensagem).
