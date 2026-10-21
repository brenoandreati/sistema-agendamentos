"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/painel/avisos/actions";
import { fromBase64Url } from "@/lib/encoding";
import { Button } from "./ui";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean(navigator.standalone));
}

/** Liga e desliga os avisos de agendamento novo neste aparelho. */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    (async () => {
      const supported = Boolean(publicKey) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return isIos() && !isInstalled() ? "ios-install" : "unsupported";
      if (Notification.permission === "denied") return "denied";
      const registration = await navigator.serviceWorker.register("/sw.js");
      return (await registration.pushManager.getSubscription()) ? "on" : "off";
    })()
      .then((value: State) => active && setState(value))
      .catch(() => active && setState("unsupported"));
    return () => {
      active = false;
    };
  }, [publicKey]);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: fromBase64Url(publicKey!),
        });
        const json = subscription.toJSON();
        const result = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
        if (result.error) {
          await subscription.unsubscribe();
          setMessage(result.error);
          return;
        }
        setState("on");
        await sendTestPush();
      } catch {
        setMessage("Não foi possível ligar os avisos neste aparelho.");
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.ok ? "Aviso de teste enviado. Ele chega em alguns segundos." : (result.error ?? null));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2 text-sm text-muted">
        <BellRing className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        Receba um aviso neste aparelho a cada agendamento novo ou cancelado pelo cliente.
      </p>
      {state === "on" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Avisos ligados neste aparelho</span>
          <Button type="button" size="sm" variant="secondary" onClick={test} disabled={pending}>
            Enviar teste
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={disable} disabled={pending}>
            Desligar
          </Button>
        </div>
      )}
      {state === "off" && (
        <div>
          <Button type="button" size="sm" onClick={enable} disabled={pending}>
            {pending ? "Ligando..." : "Ligar avisos neste aparelho"}
          </Button>
        </div>
      )}
      {state === "ios-install" && (
        <p className="text-sm">
          No iPhone, os avisos funcionam com o app instalado: toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>,
          abra o Arvan pelo ícone e ligue os avisos aqui.
        </p>
      )}
      {state === "denied" && (
        <p className="text-sm">
          Os avisos estão bloqueados para este site. Libere nas configurações do navegador (cadeado ao lado do endereço →
          Notificações) e recarregue a página.
        </p>
      )}
      {state === "unsupported" && <p className="text-sm">Este navegador não recebe avisos. Use o Chrome ou o app instalado.</p>}
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
