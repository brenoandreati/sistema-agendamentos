import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p className="text-sm text-muted">Última atualização: 21 de outubro de 2026</p>
      <p>
        Ao usar o Arvan Agendamentos, você concorda com estes termos. Leia também a{" "}
        <Link href="/privacidade" className="text-brand underline">
          política de privacidade
        </Link>
        .
      </p>

      <h2>O serviço</h2>
      <p>
        O Arvan oferece agenda online, página de agendamento, cobrança pelo Mercado Pago e controle financeiro para negócios com
        hora marcada. O sistema está em <b>fase de testes</b>: é gratuito durante esse período, pode mudar, ganhar ou perder
        funções e pode ter falhas ou ficar fora do ar por alguns momentos. Avisaremos com antecedência antes de qualquer cobrança.
      </p>

      <h2>Para quem tem um negócio</h2>
      <ul>
        <li>Você é responsável pelas informações do seu negócio, pelos preços, pelos atendimentos e pelo que combinar com seus clientes.</li>
        <li>
          Os pagamentos online caem direto na sua conta do Mercado Pago. O Arvan não recebe, não guarda e não repassa esse dinheiro.
          Devoluções e estornos são feitos por você, no Mercado Pago.
        </li>
        <li>Use os dados dos seus clientes só para os atendimentos e de acordo com a LGPD. Não envie propaganda sem permissão.</li>
        <li>Mantenha sua senha em segredo e avise o suporte se suspeitar de acesso indevido.</li>
      </ul>

      <h2>Para quem agenda</h2>
      <ul>
        <li>Informe dados verdadeiros, principalmente o WhatsApp, para o negócio conseguir falar com você.</li>
        <li>Compareça no horário ou cancele dentro do prazo do negócio. Regras de cancelamento e devolução são de cada negócio.</li>
      </ul>

      <h2>O que não é permitido</h2>
      <ul>
        <li>Usar a plataforma para algo ilegal, enganoso ou para se passar por outra pessoa ou empresa.</li>
        <li>Criar agendamentos falsos, tentar burlar a segurança ou sobrecarregar o sistema.</li>
      </ul>
      <p>Podemos suspender contas que descumprirem estes termos.</p>

      <h2>Encerramento</h2>
      <p>
        Você pode parar de usar e pedir a exclusão da conta quando quiser. A conta de cliente pode ser apagada em{" "}
        <Link href="/cliente" className="text-brand underline">
          Minha conta
        </Link>
        ; para encerrar a conta de um negócio, fale com o suporte.
      </p>

      <h2>Responsabilidade</h2>
      <p>
        Fazemos o possível para o sistema funcionar bem e manter os dados seguros, mas, por estar em testes, não garantimos que ele
        funcione sem interrupções. O Arvan não responde pelos atendimentos, preços e acordos entre o negócio e seus clientes.
        Nada nestes termos tira direitos garantidos pelo Código de Defesa do Consumidor.
      </p>

      <h2>Lei aplicável</h2>
      <p>Estes termos seguem as leis do Brasil.</p>
    </>
  );
}
