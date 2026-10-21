"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { DEMO_LOCKED } from "@/config/demo";
import { EMAIL_RE, fail, isReservedEmail, optionalText, text, type ActionState } from "@/lib/action";
import { createPasswordReset } from "@/lib/admin";
import { hashPassword } from "@/lib/password";
import { appBaseUrl } from "@/lib/payments";
import { toBase64Url } from "@/lib/encoding";
import { isHexColor, onlyDigits } from "@/lib/format";
import { PROFESSIONAL_COLORS } from "@/lib/defaults";
import { hhmmToMinutes, WEEKDAYS } from "@/lib/time";

type Hour = { weekday: number; startMin: number; endMin: number };

function readWorkingHours(form: FormData): Hour[] | string {
  const hours: Hour[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (form.get(`day${weekday}_on`) !== "on") continue;
    const day = WEEKDAYS[weekday];
    const start = hhmmToMinutes(text(form, `day${weekday}_start`));
    const end = hhmmToMinutes(text(form, `day${weekday}_end`));
    if (start === null || end === null || end <= start) return `Confira o horário de ${day}: o fim precisa ser depois do início.`;

    const breakStartText = text(form, `day${weekday}_breakStart`);
    const breakEndText = text(form, `day${weekday}_breakEnd`);
    if (breakStartText || breakEndText) {
      const breakStart = hhmmToMinutes(breakStartText);
      const breakEnd = hhmmToMinutes(breakEndText);
      if (breakStart === null || breakEnd === null || breakStart <= start || breakEnd >= end || breakEnd <= breakStart) {
        return `Confira o intervalo de ${day}: ele precisa ficar dentro do expediente.`;
      }
      hours.push({ weekday, startMin: start, endMin: breakStart }, { weekday, startMin: breakEnd, endMin: end });
    } else {
      hours.push({ weekday, startMin: start, endMin: end });
    }
  }
  return hours;
}

export async function saveProfessional(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId, shop } = await requireOwner();
  if (shop.isDemo) return fail(DEMO_LOCKED);
  const id = text(form, "id");
  const name = text(form, "name");
  const color = text(form, "color");
  const phone = optionalText(form, "phone");
  if (!name) return fail("Informe o nome do profissional.");

  const hours = readWorkingHours(form);
  if (typeof hours === "string") return fail(hours);

  const services = await db.service.findMany({
    where: { shopId, id: { in: form.getAll("serviceIds").map(String) } },
    select: { id: true },
  });
  const data = {
    name,
    phone: phone ? onlyDigits(phone) : null,
    color: isHexColor(color) ? color : PROFESSIONAL_COLORS[0],
    active: form.get("active") === "on",
    bookableOnline: form.get("bookableOnline") === "on",
  };

  if (id) {
    const existing = await db.professional.findFirst({ where: { id, shopId } });
    if (!existing) return fail("Profissional não encontrado.");
    await db.$transaction([
      db.professional.update({ where: { id }, data: { ...data, services: { set: services } } }),
      db.workingHour.deleteMany({ where: { professionalId: id } }),
      db.workingHour.createMany({ data: hours.map((h) => ({ ...h, professionalId: id })) }),
    ]);
  } else {
    const count = await db.professional.count({ where: { shopId } });
    await db.professional.create({
      data: {
        ...data,
        shopId,
        sortOrder: count,
        services: { connect: services },
        workingHours: { create: hours },
      },
    });
  }
  revalidatePath("/painel", "layout");
  redirect("/painel/profissionais");
}

export async function deleteProfessional(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId, shop } = await requireOwner();
  if (shop.isDemo) return fail(DEMO_LOCKED);
  const id = text(form, "id");
  const professional = await db.professional.findFirst({
    where: { id, shopId },
    include: { _count: { select: { appointments: true } } },
  });
  if (!professional) return fail("Profissional não encontrado.");
  if (professional._count.appointments > 0) {
    await db.professional.update({ where: { id }, data: { active: false, bookableOnline: false } });
  } else {
    if ((await db.professional.count({ where: { shopId } })) <= 1) return fail("É preciso ter pelo menos um profissional.");
    await db.professional.delete({ where: { id } });
  }
  revalidatePath("/painel", "layout");
  redirect("/painel/profissionais");
}

export type StaffAccessResult = { url?: string; hours?: number; email?: string; error?: string };

/**
 * Login do profissional na agenda dele. Sem login ainda, cria com o e-mail informado;
 * com login, só gera um link novo. O profissional cria a própria senha pelo link (uso único).
 */
export async function staffAccessLink(professionalId: string, emailInput?: string): Promise<StaffAccessResult> {
  const { shopId, shop } = await requireOwner();
  if (shop.isDemo) return { error: DEMO_LOCKED };
  const professional = await db.professional.findFirst({ where: { id: String(professionalId), shopId }, include: { user: true } });
  if (!professional) return { error: "Profissional não encontrado." };
  if (!professional.active) return { error: "Ative o profissional antes de criar o acesso." };

  let user = professional.user;
  if (!user) {
    const email = String(emailInput ?? "").trim().toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(email) || isReservedEmail(email)) return { error: "Informe um e-mail válido." };
    if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      return { error: "Esse e-mail já tem um login no Arvan. Use outro e-mail." };
    }
    // Senha aleatória que ninguém conhece: o profissional escolhe a dele pelo link.
    const passwordHash = await hashPassword(toBase64Url(crypto.getRandomValues(new Uint8Array(32))));
    user = await db.user.create({
      data: { shopId, name: professional.name, email, passwordHash, role: "STAFF", professionalId: professional.id },
    });
    revalidatePath("/painel/profissionais");
  }
  const reset = await createPasswordReset({ userId: user.id });
  return { url: `${await appBaseUrl()}/redefinir-senha?codigo=${reset.code}`, hours: reset.hours, email: user.email };
}

/** Tira o login do profissional. A agenda e o histórico dele continuam. */
export async function removeStaffAccess(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId, shop } = await requireOwner();
  if (shop.isDemo) return fail(DEMO_LOCKED);
  await db.user.deleteMany({ where: { shopId, role: "STAFF", professionalId: text(form, "professionalId") } });
  revalidatePath("/painel/profissionais", "layout");
  return { ok: true, message: "Acesso removido. O profissional não consegue mais entrar." };
}
