import { formatDateLong, formatTime, toDateStr } from "./time";

type MessageInput = {
  shopName: string;
  timezone: string;
  clientName: string;
  professionalName: string;
  services: string;
  startAt: Date;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

function when({ startAt, timezone }: MessageInput) {
  return `${formatDateLong(toDateStr(startAt, timezone)).toLowerCase()} às ${formatTime(startAt, timezone)}`;
}

export function confirmationMessage(input: MessageInput) {
  return (
    `Olá, ${firstName(input.clientName)}! Seu horário está confirmado: ` +
    `${when(input)} com ${input.professionalName} (${input.services}). ${input.shopName} agradece, até lá!`
  );
}

/** Lembrete do horário. Com `link` (página do agendamento), o cliente pode remarcar ou cancelar sozinho. */
export function reminderMessage(input: MessageInput & { link?: string | null }) {
  return (
    `Olá, ${firstName(input.clientName)}! Passando para lembrar do seu horário: ` +
    `${when(input)} com ${input.professionalName}. ${input.shopName} te espera! ` +
    (input.link ? `Se precisar remarcar ou cancelar: ${input.link}` : "Se precisar remarcar, é só responder esta mensagem.")
  );
}

export function paymentMessage(input: MessageInput & { link: string }) {
  return (
    `Olá, ${firstName(input.clientName)}! Para confirmar seu horário em ${input.shopName} ` +
    `(${when(input)}), finalize o pagamento por este link: ${input.link}`
  );
}
