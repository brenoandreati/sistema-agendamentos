import Link from "next/link";
import type { Metadata } from "next";
import { supportWhatsapp } from "@/lib/admin";
import { whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  const support = supportWhatsapp();
  return (
    <>
      <h1>Política de privacidade</h1>
      <p className="text-sm text-muted">Última atualização: 21 de outubro de 2026</p>
      <p>
        O Arvan Agendamentos é uma plataforma de agenda online e controle financeiro para negócios que atendem com hora marcada
        (barbearias, salões, nail designers, estética e outros). Esta política explica, de forma simples, quais dados guardamos,
        para quê e quais são os seus direitos pela Lei Geral de Proteção de Dados (Lei 13.709/2018, a LGPD).
      </p>

      <h2>Quem cuida dos seus dados</h2>
      <ul>
        <li>
          <b>Se você agenda um horário:</b> o negócio onde você agenda é quem decide sobre os seus dados (o &quot;controlador&quot;). O
          Arvan guarda e processa esses dados em nome dele, só para o agendamento funcionar (o &quot;operador&quot;).
        </li>
        <li>
          <b>Se você tem um negócio cadastrado:</b> o Arvan é o controlador dos dados da sua conta.
        </li>
      </ul>

      <h2>Quais dados guardamos</h2>
      <ul>
        <li>
          <b>De quem agenda:</b> nome, WhatsApp, e-mail (opcional), observações que você escrever, os horários marcados e os
          pagamentos. Com a conta opcional, também e-mail e senha (guardada de forma que nem nós conseguimos ler).
        </li>
        <li>
          <b>Do negócio:</b> nome, e-mail e WhatsApp do responsável, endereço, Instagram, logo, profissionais, serviços, clientes,
          agenda e financeiro. O token do Mercado Pago fica guardado criptografado.
        </li>
        <li>
          <b>Dados técnicos:</b> o endereço IP de quem acessa, usado para frear tentativas de invasão e abusos, e registros técnicos
          de funcionamento do sistema.
        </li>
      </ul>
      <p>Não guardamos dados de cartão. O pagamento online é feito no ambiente do Mercado Pago.</p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Marcar, confirmar, cancelar e lembrar horários, e permitir que o negócio fale com você pelo WhatsApp.</li>
        <li>Receber o pagamento online, quando o negócio cobra na hora de agendar.</li>
        <li>Mostrar ao negócio a agenda, os clientes e o financeiro dele.</li>
        <li>Manter o sistema seguro, evitar fraudes e dar suporte.</li>
      </ul>
      <p>
        Fazemos isso para cumprir o serviço que você pediu (art. 7º, V, da LGPD), por legítimo interesse em manter a plataforma
        segura (art. 7º, IX) e para cumprir obrigações legais (art. 7º, II). Não vendemos seus dados e não usamos para propaganda.
      </p>

      <h2>Com quem compartilhamos</h2>
      <ul>
        <li>Com o negócio onde você agendou.</li>
        <li>Com o Mercado Pago, quando você paga online.</li>
        <li>
          Com os serviços que mantêm o sistema no ar: Cloudflare (hospedagem) e Neon (banco de dados, com servidor em São Paulo).
          Eles só processam os dados para nós e podem ter servidores fora do Brasil, com proteções exigidas pela LGPD.
        </li>
      </ul>

      <h2>Cookies e dados no seu aparelho</h2>
      <p>
        Usamos só os cookies necessários para manter você conectado. Se você marcar &quot;lembrar meus dados neste aparelho&quot;, seu
        nome e WhatsApp ficam guardados apenas no seu navegador. Os avisos no celular, quando o negócio liga, ficam registrados só
        para aquele aparelho.
      </p>

      <h2>Por quanto tempo</h2>
      <p>
        Enquanto a conta existir ou enquanto o negócio precisar do histórico de atendimentos e pagamentos, inclusive para cumprir
        obrigações legais. Depois disso, os dados são apagados ou tornados anônimos.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir para ver, corrigir, levar para outro serviço ou apagar seus dados, e pode revogar consentimentos. A conta de
        cliente pode ser apagada a qualquer momento em <Link href="/cliente" className="text-brand underline">Minha conta</Link>.
        Para dados de um agendamento, fale com o negócio ou com o nosso suporte.
      </p>

      <h2>Segurança</h2>
      <p>
        Conexão sempre criptografada (https), senhas guardadas com hash, token de pagamento criptografado, limite de tentativas de
        login e acesso de cada negócio apenas aos próprios dados. Se houver algum incidente que possa trazer risco a você, avisamos
        os envolvidos e a Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>Fale com a gente</h2>
      <p>
        {support ? (
          <>
            Dúvidas ou pedidos sobre seus dados:{" "}
            <a href={whatsappLink(support, "Olá! Tenho uma dúvida sobre meus dados no Arvan Agendamentos.")} className="text-brand underline">
              fale com o suporte pelo WhatsApp
            </a>
            .
          </>
        ) : (
          "Dúvidas ou pedidos sobre seus dados: fale com o negócio onde você agendou, que nos encaminha o pedido."
        )}
      </p>
      <p>Esta política pode mudar. Quando houver mudança importante, avisamos na plataforma.</p>
    </>
  );
}
