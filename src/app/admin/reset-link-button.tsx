"use client";

import { useState, useTransition } from "react";
import { KeyRound, MessageCircle } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button, buttonClass } from "@/components/ui";
import { whatsappLink } from "@/lib/format";
import { adminCreateResetLink, type ResetLinkResult } from "./actions";

/** Gera o link de senha nova e já deixa pronto para mandar pelo WhatsApp. */
export function ResetLinkButton({ target, phone, name }: { target: { userId?: string; customerId?: string }; phone?: string | null; name: string }) {
  const [result, setResult] = useState<ResetLinkResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (result?.url) {
    const message = `Olá, ${name.split(" ")[0]}! Aqui está o link para você criar uma senha nova no Arvan Agendamentos (vale por ${result.hours} horas): ${result.url}`;
    return (
      <div className="flex flex-wrap gap-2">
        <CopyButton value={result.url} />
        {phone && (
          <a href={whatsappLink(phone, message)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            <MessageCircle className="size-4" aria-hidden /> Mandar no WhatsApp
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await adminCreateResetLink(target)))}
      >
        <KeyRound className="size-4" aria-hidden /> {pending ? "Gerando..." : "Link de senha nova"}
      </Button>
      {result?.error && <p className="text-xs text-red-500">{result.error}</p>}
    </div>
  );
}
