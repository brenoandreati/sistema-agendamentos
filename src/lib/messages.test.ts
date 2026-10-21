import { test } from "node:test";
import assert from "node:assert/strict";
import { reminderMessage } from "./messages";

const input = {
  shopName: "Studio Bella",
  timezone: "America/Sao_Paulo",
  clientName: "maria clara souza",
  professionalName: "Ana",
  services: "Corte",
  startAt: new Date("2026-10-22T17:30:00.000Z"), // 14:30 em Brasília
};

test("lembrete com o link para o cliente remarcar ou cancelar sozinho", () => {
  const message = reminderMessage({ ...input, link: "https://agenda.exemplo/agendar/bella/agendamento/abc" });
  assert.match(message, /^Olá, maria! /);
  assert.match(message, /quinta-feira, 22 de outubro às 14:30 com Ana/);
  assert.match(message, /Se precisar remarcar ou cancelar: https:\/\/agenda\.exemplo\/agendar\/bella\/agendamento\/abc$/);
});

test("sem link (cancelamento pelo site desligado), pede para responder a mensagem", () => {
  assert.match(reminderMessage({ ...input, link: null }), /é só responder esta mensagem\.$/);
  assert.match(reminderMessage(input), /é só responder esta mensagem\.$/);
});
