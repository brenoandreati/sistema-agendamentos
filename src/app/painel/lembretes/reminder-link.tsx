"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { markReminderSent } from "./actions";

/** Abre o WhatsApp com o lembrete pronto e marca o agendamento como "lembrete enviado". */
export function ReminderLink({
  appointmentId,
  href,
  className,
  children,
}: {
  appointmentId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() =>
        startTransition(async () => {
          await markReminderSent(appointmentId);
          router.refresh();
        })
      }
    >
      {children}
    </a>
  );
}
