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
    `Olá, ${firstName(input.clientName)}! Seu horário na ${input.shopName} está confirmado: ` +
    `${when(input)} com ${input.professionalName} (${input.services}). Até lá! ✂️`
  );
}

export function reminderMessage(input: MessageInput) {
  return (
    `Olá, ${firstName(input.clientName)}! Passando para lembrar do seu horário na ${input.shopName}: ` +
    `${when(input)} com ${input.professionalName}. Se precisar remarcar, é só responder esta mensagem.`
  );
}

export function paymentMessage(input: MessageInput & { link: string }) {
  return (
    `Olá, ${firstName(input.clientName)}! Para confirmar seu horário na ${input.shopName} ` +
    `(${when(input)}), finalize o pagamento por este link: ${input.link}`
  );
}
