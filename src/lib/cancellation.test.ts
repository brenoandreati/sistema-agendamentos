import { test } from "node:test";
import assert from "node:assert/strict";
import { customerCancelPolicy, customerReschedulePolicy, noticeLabel } from "./cancellation";

const now = new Date("2026-10-21T12:00:00.000Z");
const at = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

test("cliente cancela pelo site só dentro do prazo do negócio", () => {
  const shop = { cancelNoticeMin: 120 };
  assert.deepEqual(customerCancelPolicy({ status: "CONFIRMED", startAt: at(3) }, shop, now), { allowed: true, until: "2 horas" });
  assert.equal(customerCancelPolicy({ status: "CONFIRMED", startAt: at(1) }, shop, now).allowed, false);
  assert.equal(customerCancelPolicy({ status: "COMPLETED", startAt: at(5) }, shop, now).allowed, false);
  assert.equal(customerCancelPolicy({ status: "CONFIRMED", startAt: at(48) }, { cancelNoticeMin: null }, now).allowed, false);
  assert.equal(customerCancelPolicy({ status: "PENDING_PAYMENT", startAt: at(5) }, shop, now).allowed, true);
});

test("prazo escrito do jeito que as pessoas falam", () => {
  assert.equal(noticeLabel(60), "1 hora");
  assert.equal(noticeLabel(360), "6 horas");
  assert.equal(noticeLabel(1440), "1 dia");
  assert.equal(noticeLabel(2880), "2 dias");
  assert.equal(noticeLabel(30), "30 minutos");
});

test("cliente remarca pelo site no mesmo prazo do cancelamento e com o mesmo profissional", () => {
  const shop = { cancelNoticeMin: 120 };
  const professional = { active: true, bookableOnline: true };
  const ok = customerReschedulePolicy({ status: "CONFIRMED", startAt: at(3), professional }, shop, now);
  assert.deepEqual(ok, { allowed: true, until: "2 horas" });
  // Em cima da hora, já pago-pendente, concluído ou com o site fechado para cancelar: não.
  assert.equal(customerReschedulePolicy({ status: "CONFIRMED", startAt: at(1), professional }, shop, now).allowed, false);
  assert.equal(customerReschedulePolicy({ status: "PENDING_PAYMENT", startAt: at(5), professional }, shop, now).allowed, false);
  assert.equal(customerReschedulePolicy({ status: "COMPLETED", startAt: at(5), professional }, shop, now).allowed, false);
  assert.equal(customerReschedulePolicy({ status: "CONFIRMED", startAt: at(48), professional }, { cancelNoticeMin: null }, now).allowed, false);
  // Profissional saiu do agendamento online: remarca falando com o negócio.
  const offline = { active: true, bookableOnline: false };
  assert.equal(customerReschedulePolicy({ status: "CONFIRMED", startAt: at(48), professional: offline }, shop, now).allowed, false);
});
