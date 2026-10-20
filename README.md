# Navalha: agenda online e financeiro para barbearias

Sistema de agendamento para barbearias, no estilo do InBarber, com pagamento online na hora de agendar e controle financeiro.

> "Navalha" é um nome provisório. Para trocar o nome e o slogan, edite `src/config/brand.ts`.
> A cor e o logo de cada barbearia são configurados dentro do sistema, em **Configurações**.

## O que o sistema faz

**Para o cliente (página pública `/agendar/<sua-barbearia>`)**
- Escolhe um ou mais serviços, o barbeiro (ou "sem preferência"), o dia e o horário livre.
- Paga por **Pix ou cartão pelo Mercado Pago** para confirmar o horário. O valor pode ser o total, um sinal (%) ou nada online.
- O horário fica reservado por alguns minutos enquanto ele paga. Se não pagar, o horário volta a ficar livre.
- Recebe a confirmação na tela, com botão para salvar na agenda do celular e falar com a barbearia no WhatsApp.

**Para a barbearia (painel `/painel`)**
- **Agenda do dia** com uma coluna por barbeiro: criar, remarcar, concluir, marcar falta, cancelar e fazer encaixe.
- **Bloqueio de horários** (folga, almoço, compromisso).
- **Vários barbeiros**, cada um com seus dias e horários de trabalho (com intervalo) e os serviços que faz.
- **Clientes** com histórico, total gasto, faltas e botão de WhatsApp com mensagem pronta de confirmação e lembrete.
- **Financeiro** por dia, semana, mês e ano:
  - quanto entrou e a comparação com o período anterior;
  - quanto falta receber e ticket médio;
  - gráfico do que entrou por dia ou por mês;
  - **quem pagou** e **quem ainda não pagou**;
  - divisão por forma de pagamento e entre online e na barbearia.
- Registro de pagamento na barbearia (Pix, dinheiro, débito, crédito) e **entradas avulsas** (cliente sem agendamento).
- **Exportar planilha** (CSV que abre direto no Excel).
- Funciona no celular e pode ser instalado na tela inicial, como um app.

## Como rodar no seu computador

Você precisa do [Node.js 20+](https://nodejs.org) e de um banco PostgreSQL. Pode ser local ou gratuito na nuvem, como [Neon](https://neon.tech) ou [Supabase](https://supabase.com).

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e AUTH_SECRET
npm run db:migrate          # cria as tabelas
npm run db:seed             # opcional: barbearia de exemplo com 30 dias de dados
npm run dev
```

Abra http://localhost:3000.
- Para criar uma conta nova, use **Criar conta**.
- Para entrar na barbearia de exemplo, use o e-mail `demo@exemplo.com` e a senha `123456`.
- A página de agendamento da barbearia de exemplo fica em http://localhost:3000/agendar/exemplo.

## Pagamento online (Mercado Pago)

Sem token do Mercado Pago, o sistema funciona em **modo demonstração**: o cliente vê uma tela que simula o pagamento e nada é cobrado. É o jeito de testar tudo antes de ligar a cobrança.

Para cobrar de verdade:
1. Crie uma conta no Mercado Pago e acesse **Suas integrações**: https://www.mercadopago.com.br/developers/panel/app.
2. Crie uma aplicação do tipo *Checkout Pro* e copie o **Access Token de produção** (começa com `APP_USR-`).
3. No sistema, abra **Configurações → Pagamento online**, cole o token e salve.

O dinheiro cai direto na conta do Mercado Pago da barbearia. O sistema confirma o pagamento de duas formas:
- quando o cliente volta do checkout;
- pelo aviso automático (webhook) que o Mercado Pago envia para `/api/webhooks/mercadopago/<id-da-barbearia>`.

O webhook só funciona com o sistema publicado em um endereço `https://`.

## Publicar na internet

A forma mais simples é a [Vercel](https://vercel.com) com um banco no [Neon](https://neon.tech):
1. Suba este repositório no GitHub e importe o projeto na Vercel.
2. Configure as variáveis de ambiente:
   - `DATABASE_URL`;
   - `AUTH_SECRET`, gerado com `openssl rand -hex 32`;
   - `APP_URL`, com o endereço do site, ex.: `https://agenda.suabarbearia.com.br`.
3. Antes do primeiro acesso, rode `npm run db:deploy` (aplica as tabelas no banco de produção).

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` | Rodar em modo desenvolvimento |
| `npm run build` / `npm start` | Gerar e rodar a versão de produção |
| `npm test` | Testes da lógica de horários, datas, períodos e valores |
| `npm run lint` / `npm run typecheck` | Verificar o código |
| `npm run db:migrate` | Criar ou alterar tabelas (desenvolvimento) |
| `npm run db:deploy` | Aplicar as tabelas em produção |
| `npm run db:seed` | Criar a barbearia de exemplo |

## Onde fica cada coisa

```
prisma/schema.prisma        tabelas: barbearia, usuários, profissionais, horários, serviços,
                            clientes, agendamentos, bloqueios e pagamentos
src/config/brand.ts         nome e slogan do sistema
src/lib/availability.ts     cálculo dos horários livres (com testes)
src/lib/scheduling.ts       agenda: horários livres, conflitos e reservas expiradas
src/lib/payments.ts         cobrança online e confirmação de pagamentos
src/lib/mercadopago.ts      integração com a API do Mercado Pago
src/lib/finance.ts          números do relatório financeiro
src/app/agendar/[slug]/     página pública de agendamento e pagamento
src/app/painel/             painel da barbearia (agenda, financeiro, cadastros, configurações)
```

## Tecnologia

Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, Prisma 6 e PostgreSQL.
O login usa sessão em cookie assinado (JWT) e senha com bcrypt. O token do Mercado Pago fica criptografado no banco (AES-256-GCM).
