export type ActionState = { error?: string; message?: string; ok?: boolean };

export const initialState: ActionState = {};

export function fail(error: string): ActionState {
  return { error };
}

/** Texto do formulário, sem espaços nas pontas e com tamanho máximo. */
export function text(form: FormData, name: string, max = 1000): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function optionalText(form: FormData, name: string, max = 1000): string | null {
  return text(form, name, max) || null;
}

export const MIN_PASSWORD = 8;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mails internos (demonstração) não podem ser usados em contas reais. */
export function isReservedEmail(email: string) {
  return email.endsWith("@arvan.local");
}

export function int(form: FormData, name: string): number | null {
  const value = text(form, name);
  if (!/^-?\d+$/.test(value)) return null;
  return Number(value);
}
