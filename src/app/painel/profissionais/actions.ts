"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, optionalText, text, type ActionState } from "@/lib/action";
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
  const { shopId } = await requireUser();
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
  const { shopId } = await requireUser();
  const id = text(form, "id");
  const professional = await db.professional.findFirst({
    where: { id, shopId },
    include: { _count: { select: { appointments: true } } },
  });
  if (!professional) return fail("Profissional não encontrado.");
  if (professional._count.appointments > 0) {
    await db.professional.update({ where: { id }, data: { active: false, bookableOnline: false } });
  } else {
    if ((await db.professional.count({ where: { shopId } })) <= 1) return fail("A barbearia precisa ter pelo menos um profissional.");
    await db.professional.delete({ where: { id } });
  }
  revalidatePath("/painel", "layout");
  redirect("/painel/profissionais");
}
