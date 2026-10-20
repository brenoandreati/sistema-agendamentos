"use client";

import { createContext, startTransition, useActionState, useContext, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui";
import type { ActionState } from "@/lib/action";

const PendingContext = createContext(false);

/**
 * Formulário ligado a uma Server Action que mostra erros e mensagens de sucesso.
 * Não limpa os campos quando há erro, para a pessoa não perder o que digitou.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Pergunta de confirmação antes de enviar. */
  confirm?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        if (submitter instanceof HTMLButtonElement && submitter.name) data.set(submitter.name, submitter.value);
        startTransition(() => dispatch(data));
      }}
    >
      <PendingContext.Provider value={pending}>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && !state.error && <Alert tone="success">{state.message}</Alert>}
        {children}
      </PendingContext.Provider>
    </form>
  );
}

export function SubmitButton({ children, pendingText, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const contextPending = useContext(PendingContext);
  const { pending: formPending } = useFormStatus();
  const pending = contextPending || formPending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingText ?? "Salvando...") : children}
    </Button>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
          : "mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
      }
    >
      {children}
    </div>
  );
}
