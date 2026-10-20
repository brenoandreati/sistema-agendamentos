"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui";

/** Copia um texto. Caminhos relativos ("/agendar/...") viram endereço completo do site. */
export function CopyButton({ value, label = "Copiar link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        const text = value.startsWith("/") ? `${window.location.origin}${value}` : value;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt("Copie o link:", text);
          return;
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copiado!" : label}
    </Button>
  );
}
