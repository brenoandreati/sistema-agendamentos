# Arvan Agendamentos

Agenda online e financeiro para quem atende com hora marcada, com pagamento por Pix ou cartão na hora de agendar. Roda no **Cloudflare**.

No ar em: https://arvan-agendamentos.brenoandreati.workers.dev

> Para trocar o nome ou o slogan do sistema, edite `src/config/brand.ts`.
> As áreas de atuação, com cor, ícone e serviços padrão de cada uma, ficam em `src/config/niches.ts`.
> A cor e o logo de cada negócio são configurados dentro do sistema, em **Configurações**.

## O que o sistema faz

**Para quem se cadastra**
- Na página inicial, a pessoa escolhe a área dela:
  - **barbeiro**;
  - **cabeleireira**;
  - **nail designer**;
  - **outra área**: estética, cílios, sobrancelha, maquiagem e afins.
- O cadastro já vem com a cor, o ícone e os serviços típicos daquela área. Agenda e financeiro funcionam igual para todas.
- Cada área tem um visual próprio no painel e na página de agendamento:
  - **barbeiro:** menu escuro e títulos fortes;
  - **cabeleireira:** títulos serifados e cantos bem arredondados;
  - **nail designer:** fonte arredondada e menu colorido;
  - **outra área:** estilo calmo, de spa.
- A área pode ser trocada em **Configurações → Aparência**.

**Para o cliente (página pública `/agendar/<seu-negocio>`)**
- Pode agendar **sem cadastro**, só com nome e WhatsApp (e-mail opcional).
- Ou pode **criar uma conta**: os dados ficam salvos para as próximas vezes, e a página **Minha conta** (`/cliente`) mostra todos os horários dele, em qualquer negócio da plataforma.
- Escolhe um ou mais serviços, o barbeiro (ou "sem preferência"), o dia e o horário livre.
- Paga por **Pix ou cartão pelo Mercado Pago** para confirmar. O valor pode ser o total, um sinal (%) ou nada online.
- O horário fica reservado por alguns minutos enquanto ele paga. Se não pagar, o horário volta a ficar livre.
- Se duas pessoas tentam o mesmo horário ao mesmo tempo, só uma consegue. A outra recebe um aviso para escolher outro horário.
- Recebe a confirmação na tela, com botão para salvar na agenda do celular e falar com o negócio no WhatsApp.

**Para o negócio (painel `/painel`)**
- **Agenda do dia** com uma coluna por barbeiro: criar, remarcar, concluir, marcar falta, cancelar e fazer encaixe.
- **Bloqueio de horários** (folga, almoço, compromisso).
- **Vários profissionais**, cada um com seus dias e horários de trabalho (com intervalo) e os serviços que faz.
- **Clientes** com histórico, total gasto, faltas e botão de WhatsApp com mensagem pronta de confirmação e lembrete.
- **Financeiro** por dia, semana, mês e ano:
  - quanto entrou e a comparação com o período anterior;
  - quanto falta receber e ticket médio;
  - gráfico do que entrou;
  - **quem pagou** e **quem ainda não pagou**;
  - divisão por forma de pagamento e entre online e presencial.
- Registro de pagamento presencial (Pix, dinheiro, débito, crédito) e **entradas avulsas** (cliente sem agendamento).
- **Exportar planilha** (CSV que abre direto no Excel).
- Funciona no celular e pode ser instalado na tela inicial, como um app.

---

## Como colocar no ar no Cloudflare (passo a passo)

Você vai precisar de duas contas gratuitas:
- **Neon**, que guarda o banco de dados;
- **Cloudflare**, que roda o sistema.

Leva uns 15 minutos e não precisa instalar nada no computador.

### 1. Criar o banco de dados no Neon

1. Entre em https://neon.tech e crie uma conta. Dá para entrar com Google ou GitHub.
2. Crie um projeto:
   - **Nome:** `arvan`
   - **Região:** **AWS São Paulo (sa-east-1)**. Fica mais rápido para clientes no Brasil.
3. Na tela do projeto, clique em **Connect**, deixe a opção **Connection pooling** ligada e copie o endereço.
   Ele começa com `postgresql://` e termina com `?sslmode=require`.
   Guarde esse endereço: ele é o seu **DATABASE_URL**.

### 2. Gerar a chave secreta do sistema

Crie uma senha aleatória e comprida, com pelo menos 40 letras e números misturados. Ela protege o login e o token do Mercado Pago.
- Pode usar um gerador de senhas, como https://1password.com/password-generator.
- Ou, num computador com terminal, rode `openssl rand -hex 32`.

Guarde essa senha: ela é o seu **AUTH_SECRET**.

### 3. Publicar no Cloudflare

1. Entre em https://dash.cloudflare.com e crie uma conta.
2. No menu lateral, abra **Compute (Workers)** → **Workers & Pages** → **Create** → **Import a repository**.
3. Conecte sua conta do GitHub e escolha o repositório **sistema-agendamentos**.
4. Preencha as configurações:
   | Campo | Valor |
   |---|---|
   | Project name | `arvan-agendamentos` (precisa ser exatamente esse) |
   | Build command | `npx prisma migrate deploy && npx opennextjs-cloudflare build` |
   | Deploy command | `npx opennextjs-cloudflare deploy` |
5. Abra **Advanced settings → Build variables** e adicione:
   - `DATABASE_URL`, com o endereço do Neon. O build usa esse endereço para criar as tabelas no banco.
6. Clique em **Deploy** e espere terminar. Leva uns 3 minutos.
7. Quando terminar, o Cloudflare mostra o endereço do sistema, algo como `https://arvan-agendamentos.SEU-USUARIO.workers.dev`. Copie esse endereço.
8. Abra o Worker `arvan-agendamentos` → **Settings** → **Variables and Secrets** → **Add**. Adicione os três como **Secret**:
   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | o endereço do Neon |
   | `AUTH_SECRET` | a chave secreta do passo 2 |
   | `APP_URL` | o endereço do sistema, ex.: `https://arvan-agendamentos.SEU-USUARIO.workers.dev` |
9. Salve (**Deploy**). Pronto: abra o endereço, escolha a sua área e cadastre o seu negócio.

Daqui para frente, toda alteração enviada ao GitHub é publicada sozinha pelo Cloudflare.

**Domínio próprio (opcional):** se o seu domínio já estiver no Cloudflare, abra o Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain** e digite, por exemplo, `agenda.arvan.com.br`. Depois troque o `APP_URL` para esse endereço.

**Banco mais rápido (opcional):** crie um **Hyperdrive** em **Storage & Databases → Hyperdrive**, usando o endereço do Neon. Depois adicione no `wrangler.jsonc`:

```jsonc
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<id do hyperdrive>" }]
```

O sistema passa a usar o Hyperdrive automaticamente.

**Plano do Cloudflare:** o sistema cabe no plano gratuito, com 2,2 MB de um limite de 3 MB. O plano gratuito limita o processamento de cada acesso. Se aparecer o **erro 1102** em algum momento de uso intenso, ative o plano **Workers Paid** (US$ 5 por mês) em **Workers & Pages → Plans**.

### 4. Ligar o pagamento online (Mercado Pago)

Sem token do Mercado Pago, o sistema funciona em **modo demonstração**: o cliente vê uma tela que simula o pagamento e nada é cobrado. Não divulgue o link para clientes nesse modo. Ou conecte o Mercado Pago, ou escolha "Nada online" em Configurações.

Para cobrar de verdade:
1. Acesse https://www.mercadopago.com.br/developers/panel/app e crie uma aplicação do tipo **Checkout Pro**.
2. Copie o **Access Token de produção**. Ele começa com `APP_USR-`.
3. No sistema, abra **Configurações → Pagamento online**, cole o token e salve.

O dinheiro cai direto na conta do Mercado Pago do negócio. O sistema confirma o pagamento de duas formas:
- quando o cliente volta do checkout;
- pelo aviso automático que o Mercado Pago envia para `/api/webhooks/mercadopago/<id-do-negócio>`.

---

## Rodar no seu computador (para desenvolver)

Você precisa do [Node.js 20+](https://nodejs.org) e de um banco PostgreSQL. Pode ser o próprio Neon.

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e AUTH_SECRET
npm run db:migrate          # cria as tabelas
npm run db:seed             # opcional: negócio de exemplo (barbearia) com 30 dias de dados
npm run dev                 # abre em http://localhost:3000
```

- Para entrar no negócio de exemplo (uma barbearia), use o e-mail `demo@exemplo.com` e a senha `123456`.
- A página de agendamento dela fica em `/agendar/exemplo`.

Para testar exatamente como vai rodar no Cloudflare, copie `.dev.vars.example` para `.dev.vars` e rode `npm run preview`. O sistema abre em http://localhost:8787.

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` | Rodar em modo desenvolvimento |
| `npm run preview` | Rodar localmente no mesmo motor do Cloudflare |
| `npm run deploy` | Publicar no Cloudflare pelo terminal (precisa do `npx wrangler login` antes) |
| `npm test` | Testes da lógica de horários, datas, períodos, valores e senhas |
| `npm run lint` / `npm run typecheck` | Verificar o código |
| `npm run db:migrate` | Criar ou alterar tabelas (desenvolvimento) |
| `npm run db:deploy` | Aplicar as tabelas em produção |
| `npm run db:seed` | Criar o negócio de exemplo |

## Onde fica cada coisa

```
prisma/schema.prisma        tabelas: negócio, usuários, profissionais, horários, serviços, clientes,
                            contas de cliente, agendamentos, bloqueios e pagamentos
wrangler.jsonc              configuração do Cloudflare Workers
open-next.config.ts         configuração do adaptador Next.js → Cloudflare
src/config/brand.ts         nome e slogan do sistema
src/config/niches.ts        áreas de atuação (cor, ícone, serviços padrão, nome da equipe e frase de boas-vindas)
src/app/globals.css         temas visuais de cada área (fontes, cantos, fundo e menu), em [data-niche]
src/lib/db.ts               conexão com o banco (uma por acesso no Cloudflare)
src/lib/availability.ts     cálculo dos horários livres (com testes)
src/lib/scheduling.ts       agenda: horários livres, conflitos e reservas expiradas
src/lib/payments.ts         cobrança online e confirmação de pagamentos
src/lib/mercadopago.ts      integração com a API do Mercado Pago
src/lib/finance.ts          números do relatório financeiro
src/app/agendar/[slug]/     página pública de agendamento e pagamento
src/app/painel/             painel do negócio (agenda, financeiro, cadastros, configurações)
src/app/cliente/            conta do cliente: entrar, criar conta e "Minha conta"
```

## Tecnologia

- Next.js 16 (App Router, Server Actions), React 19, TypeScript e Tailwind CSS 4.
- Prisma 6 com o driver `pg` e banco PostgreSQL.
- Publicado no Cloudflare Workers pelo [OpenNext](https://opennext.js.org/cloudflare).
- Segurança:
  - o login usa sessão em cookie assinado (JWT), com logins separados para o dono do negócio e para o cliente;
  - as senhas são guardadas com PBKDF2;
  - o token do Mercado Pago fica criptografado no banco (AES-256-GCM).
