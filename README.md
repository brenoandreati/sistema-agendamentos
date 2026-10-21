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
- Quando o negócio tem mais de um profissional, o cliente escolhe primeiro **com quem** quer ser atendido. A lista mostra cada nome e os serviços que a pessoa faz, e tem a opção "sem preferência". Depois aparecem só os serviços daquele profissional.
- Quando o negócio tem um profissional só, o agendamento já começa pelo serviço.
- Em seguida escolhe o dia e o horário livre.
- Paga por **Pix ou cartão pelo Mercado Pago** para confirmar. O valor pode ser o total, um sinal (%) ou nada online. Se o negócio ainda não conectou o Mercado Pago, o cliente agenda sem pagar online e paga no local.
- O horário fica reservado por alguns minutos enquanto ele paga. Se não pagar, o horário volta a ficar livre.
- Se duas pessoas tentam o mesmo horário ao mesmo tempo, só uma consegue. A outra recebe um aviso para escolher outro horário.
- Recebe a confirmação na tela, com botão para salvar na agenda do celular e falar com o negócio no WhatsApp.
- **Cancela sozinho** pelo link do agendamento, até o prazo que o negócio escolher (ex.: 2 horas antes).
- Pode marcar "lembrar meus dados neste aparelho" (vem desmarcado) e pode apagar a própria conta em **Minha conta**.

**Para o negócio (painel `/painel`)**
- **Avisos no celular** a cada agendamento novo, pago ou cancelado pelo cliente (notificação do navegador; no iPhone, com o app instalado na tela de início).
- **Novos agendamentos online** e **Precisa de atenção** no início do painel. A segunda lista mostra pagamentos online que precisam ser devolvidos: horário cancelado ou pago depois de outra pessoa pegar o horário.
- **Calendário do mês** na agenda, com um pontinho nos dias que têm agendamento. Ao clicar num dia, abre a agenda daquele dia.
- **Agenda do dia** com uma coluna por profissional, mostrando qual cliente está em cada horário: criar, remarcar, concluir, marcar falta, cancelar e fazer encaixe.
- **Bloqueio de horários** (folga, almoço, compromisso).
- **Vários profissionais**, cada um com seus dias e horários de trabalho (com intervalo) e os **serviços que faz**, marcados no cadastro do profissional.
- **Clientes** com histórico, total gasto, faltas e botão de WhatsApp com mensagem pronta de confirmação e lembrete.
- **Financeiro** por dia, semana, mês e ano:
  - quanto entrou e a comparação com o período anterior;
  - quanto falta receber e ticket médio;
  - gráfico do que entrou;
  - **quem pagou** e **quem ainda não pagou**;
  - divisão por forma de pagamento e entre online e presencial.
- Registro de pagamento presencial (Pix, dinheiro, débito, crédito) e **entradas avulsas** (cliente sem agendamento).
- **Apagar dados pessoais** de um cliente que pedir (LGPD): o histórico de atendimentos e pagamentos continua, sem nome, telefone e e-mail.
- Regras da agenda: intervalo dos horários, antecedência mínima, até quantos dias à frente, prazo de cancelamento pelo cliente e **fuso horário** do estado.
- **Exportar planilha** (CSV que abre direto no Excel).
- Funciona no celular e pode ser instalado na tela inicial, como um app.

**Demonstração (`/demonstracao`)**
- Um negócio de exemplo para cada área, com 30 dias de agenda, clientes e financeiro fictícios:

  | Área | Negócio | Mostra |
  |---|---|---|
  | Barbearia | Barbearia Navalha de Ouro | 3 barbeiros, pagamento total online |
  | Salão | Studio Bella Hair | 2 profissionais, sinal de 30% online |
  | Nail designer | Bia Nails Studio | 2 nail designers, pagamento total online |
  | Estética | Espaço Lumi Estética | 1 profissional (agendamento começa pelo serviço), pagamento no local |

- Entra no painel com um clique, sem conta e sem senha. Também abre a página de agendamento que o cliente vê.
- Pode mexer à vontade: **Restaurar dados**, no topo do painel, volta tudo ao normal. A agenda também é refeita sozinha a cada 12 horas, para acompanhar a data de hoje.
- As configurações ficam travadas e o pagamento é sempre simulado. Ninguém consegue usar a demonstração para receber dinheiro ou mudar o link.
- A página não aparece no Google e não tem link na página inicial. Para mostrar para alguém, mande o endereço `/demonstracao`.

**Para você, dono da plataforma**
- **Administração (`/admin`)**: lista os negócios cadastrados, quem está usando (agendamentos na semana, último agendamento), quem conectou o Mercado Pago e quem ligou os avisos. Só abre para os e-mails em `ADMIN_EMAILS`, e a pessoa precisa ter uma conta de negócio com esse e-mail.
- **Senha esquecida**: a pessoa toca em "Esqueci minha senha" e fala com o suporte no WhatsApp (`SUPPORT_WHATSAPP`). No `/admin`, você gera um link de uso único (vale 24 horas) e manda pelo próprio WhatsApp. A senha nova desconecta os outros aparelhos.
- **Termos de uso** (`/termos`) e **política de privacidade** (`/privacidade`), com aceite obrigatório ao criar conta. São um texto base: vale um advogado revisar antes de cobrar pelo serviço.

**Segurança**
- Limite de tentativas no login, no cadastro, na senha nova e no agendamento online (contra robôs e quem tenta adivinhar senha).
- Cada WhatsApp pode ter até 4 horários futuros no mesmo negócio pelo site.
- Trocar a senha desconecta os outros aparelhos.
- Senhas com no mínimo 8 caracteres, guardadas com hash. O token do Mercado Pago fica criptografado.
- Na demonstração, os dados digitados por visitantes (WhatsApp e e-mail) não são guardados e o catálogo fica travado.

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
   | `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` | chaves dos avisos no celular. Gere com `npm run vapid` (uma vez só: trocar desliga os avisos já ligados) |
   | `ADMIN_EMAILS` | seu e-mail, para abrir o `/admin` |
   | `SUPPORT_WHATSAPP` | o WhatsApp do suporte, com DDD (ex.: `11987654321`) |
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

Sem token do Mercado Pago, ninguém paga online: o cliente agenda e paga no local, e o painel mostra um aviso para conectar. Cada negócio conecta a própria conta, e o dinheiro cai direto nela (a plataforma não recebe nem repassa valores).

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
src/components/brand-logo.tsx  logo da Arvan em vetor (o "A" segue a cor do texto, o "V" é sempre azul)
public/icon.svg             ícone do navegador; icon-192/512.png, apple-icon.png e favicon.ico saem dele
src/config/niches.ts        áreas de atuação (cor, ícone, serviços padrão, nome da equipe e frase de boas-vindas)
src/config/demo.ts          negócios da demonstração (profissionais, serviços e clientes de cada área)
src/app/globals.css         temas visuais de cada área (fontes, cantos, fundo e menu), em [data-niche]
src/lib/db.ts               conexão com o banco (uma por acesso no Cloudflare)
src/lib/availability.ts     cálculo dos horários livres (com testes)
src/lib/scheduling.ts       agenda: horários livres, conflitos e reservas expiradas
src/lib/payments.ts         cobrança online e confirmação de pagamentos
src/lib/mercadopago.ts      integração com a API do Mercado Pago
src/lib/finance.ts          números do relatório financeiro
src/lib/demo.ts             cria e restaura os negócios da demonstração
src/lib/demo-data.ts        gera a agenda e os pagamentos fictícios (com testes)
src/lib/web-push.ts         avisos no celular: criptografia e assinatura (com testes)
src/lib/notify.ts           envia os avisos de agendamento novo, pago e cancelado
src/lib/rate-limit.ts       limite de tentativas (login, cadastro, agendamento)
src/lib/cancellation.ts     regras de cancelamento pelo cliente (com testes)
src/lib/admin.ts            administração da plataforma e links de senha nova
public/sw.js                recebe os avisos no aparelho do dono
src/app/agendar/[slug]/     página pública de agendamento e pagamento
src/app/painel/             painel do negócio (agenda, financeiro, cadastros, configurações)
src/app/cliente/            conta do cliente: entrar, criar conta e "Minha conta"
src/app/demonstracao/       página de demonstração de todas as áreas
src/app/admin/              administração da plataforma (só para ADMIN_EMAILS)
src/app/(legal)/            termos de uso e política de privacidade
```

## Tecnologia

- Next.js 16 (App Router, Server Actions), React 19, TypeScript e Tailwind CSS 4.
- Prisma 6 com o driver `pg` e banco PostgreSQL.
- Publicado no Cloudflare Workers pelo [OpenNext](https://opennext.js.org/cloudflare).
- Segurança:
  - o login usa sessão em cookie assinado (JWT), com logins separados para o dono do negócio e para o cliente;
  - as senhas são guardadas com PBKDF2;
  - o token do Mercado Pago fica criptografado no banco (AES-256-GCM).
